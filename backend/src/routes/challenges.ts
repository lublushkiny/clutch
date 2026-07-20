import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { randomUUID } from 'crypto';
import { pool } from '../config/database';

const router = Router();

// GET my challenges (incoming and outgoing)
router.get('/', authenticateToken, async (req, res) => {
    const userId = req.user!.id;
    try {
        const incomingResult = await pool.query(
            `SELECT c.id, c."challengerId", c."opponentId", c.status, c.timestamp, p.name as "challengerName" 
             FROM challenges c
             JOIN players p ON c."challengerId" = p.id
             WHERE c."opponentId" = $1 AND c.status = 'pending'`, [userId]
        );
        const outgoingResult = await pool.query(
            `SELECT c.id, c."challengerId", c."opponentId", c.status, c.timestamp, p.name as "opponentName" 
             FROM challenges c
             JOIN players p ON c."opponentId" = p.id
             WHERE c."challengerId" = $1 AND c.status = 'pending'`, [userId]
        );
        res.json({ incoming: incomingResult.rows, outgoing: outgoingResult.rows });
    } catch (error) {
        console.error('Failed to get challenges:', error);
        res.status(500).json({ message: 'Failed to retrieve challenges' });
    }
});

// POST a new challenge
router.post('/', authenticateToken, async (req, res) => {
    const { opponentId } = req.body;
    const challengerId = req.user!.id;

    if (!opponentId) {
        return res.status(400).json({ message: 'Opponent ID is required.' });
    }
    if (opponentId === challengerId) {
        return res.status(400).json({ message: 'You cannot challenge yourself.' });
    }

    try {
        // Check for existing live match
        const liveMatchResult = await pool.query(
            `SELECT id FROM matches 
             WHERE status = 'live' AND 
             (("playerAId" = $1 AND "playerBId" = $2) OR ("playerAId" = $3 AND "playerBId" = $4))`,
            [challengerId, opponentId, opponentId, challengerId]
        );
        if ((liveMatchResult.rowCount ?? 0) > 0) {
            return res.status(409).json({ message: 'A live match between these players is already in progress.' });
        }
        
        // Check for existing pending challenge between these players
        const existingChallengeResult = await pool.query(
            `SELECT id FROM challenges 
             WHERE status = 'pending' AND 
             (("challengerId" = $1 AND "opponentId" = $2) OR ("challengerId" = $3 AND "opponentId" = $4))`,
            [challengerId, opponentId, opponentId, challengerId]
        );
        if ((existingChallengeResult.rowCount ?? 0) > 0) {
            return res.status(409).json({ message: 'A pending challenge between these players already exists.' });
        }

        const challengeId = randomUUID();
        await pool.query(
            'INSERT INTO challenges (id, "challengerId", "opponentId", status, timestamp) VALUES ($1, $2, $3, $4, $5)',
            [challengeId, challengerId, opponentId, 'pending', Date.now()]
        );
        res.status(201).json({ message: 'Challenge sent!', challengeId });
    } catch (error) {
        console.error('Failed to create challenge:', error);
        res.status(500).json({ message: 'Failed to create challenge' });
    }
});

// POST to accept a challenge
router.post('/:id/accept', authenticateToken, async (req, res) => {
    const challengeId = req.params.id;
    const userId = req.user!.id;

    try {
        await pool.query('BEGIN');

        const challengeResult = await pool.query('SELECT * FROM challenges WHERE id = $1', [challengeId]);
        if (challengeResult.rowCount === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ message: 'Challenge not found.' });
        }
        const challenge = challengeResult.rows[0];

        if (challenge.opponentId !== userId || challenge.status !== 'pending') {
            await pool.query('ROLLBACK');
            return res.status(403).json({ message: 'Challenge not found or you are not the opponent.' });
        }

        // Update challenge status
        await pool.query(`UPDATE challenges SET status = 'accepted' WHERE id = $1`, [challengeId]);

        // Create a new match with 'live' status
        const matchId = randomUUID();
        await pool.query(
            `INSERT INTO matches (id, "playerAId", "playerBId", status, timestamp) VALUES ($1, $2, $3, $4, $5)`,
            [matchId, challenge.challengerId, challenge.opponentId, 'live', Date.now()]
        );
        
        await pool.query('COMMIT');
        res.status(200).json({ message: 'Challenge accepted. Match created.', matchId });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Failed to accept challenge:', error);
        res.status(500).json({ message: 'Failed to accept challenge' });
    }
});

// POST to reject a challenge
router.post('/:id/reject', authenticateToken, async (req, res) => {
    const challengeId = req.params.id;
    const userId = req.user!.id;

    try {
        await pool.query('BEGIN'); // Start transaction for safety.

        const challengeResult = await pool.query('SELECT * FROM challenges WHERE id = $1', [challengeId]);
        if (challengeResult.rowCount === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ message: 'Challenge not found.' });
        }
        const challenge = challengeResult.rows[0];

        // Allow either challenger or opponent to cancel/reject
        if ((challenge.opponentId !== userId && challenge.challengerId !== userId) || challenge.status !== 'pending') {
             await pool.query('ROLLBACK');
            return res.status(403).json({ message: 'Challenge not found or you cannot reject/cancel it.' });
        }

        await pool.query(`UPDATE challenges SET status = 'rejected' WHERE id = $1`, [challengeId]);
        
        await pool.query('COMMIT');
        res.status(200).json({ message: 'Challenge rejected.' });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Failed to reject challenge:', error);
        res.status(500).json({ message: 'Failed to reject challenge' });
    }
});

export default router;
