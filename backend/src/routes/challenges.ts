import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { randomUUID } from 'crypto';

const router = Router();

// GET my challenges (incoming and outgoing)
router.get('/', authenticateToken, async (req, res) => {
    const userId = req.user!.id;
    try {
        const db = req.db!;
        const incoming = await db.all(
            `SELECT c.*, p.name as challengerName 
             FROM challenges c
             JOIN players p ON c.challengerId = p.id
             WHERE c.opponentId = ? AND c.status = 'pending'`, userId
        );
        const outgoing = await db.all(
            `SELECT c.*, p.name as opponentName 
             FROM challenges c
             JOIN players p ON c.opponentId = p.id
             WHERE c.challengerId = ? AND c.status = 'pending'`, userId
        );
        res.json({ incoming, outgoing });
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
        const db = req.db!;
        // Check for existing live match
        const liveMatch = await db.get(
            `SELECT id FROM matches 
             WHERE status = 'live' AND 
             ((playerAId = ? AND playerBId = ?) OR (playerAId = ? AND playerBId = ?))`,
            challengerId, opponentId, opponentId, challengerId
        );
        if (liveMatch) {
            return res.status(409).json({ message: 'A live match between these players is already in progress.' });
        }
        
        // Check for existing pending challenge between these players
        const existingChallenge = await db.get(
            `SELECT id FROM challenges 
             WHERE status = 'pending' AND 
             ((challengerId = ? AND opponentId = ?) OR (challengerId = ? AND opponentId = ?))`,
            challengerId, opponentId, opponentId, challengerId
        );
        if (existingChallenge) {
            return res.status(409).json({ message: 'A pending challenge between these players already exists.' });
        }

        const challengeId = randomUUID();
        await db.run(
            'INSERT INTO challenges (id, challengerId, opponentId, timestamp) VALUES (?, ?, ?, ?)',
            challengeId, challengerId, opponentId, Date.now()
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
        const db = req.db!;
        await db.run('BEGIN TRANSACTION');

        const challenge = await db.get('SELECT * FROM challenges WHERE id = ?', challengeId);
        if (!challenge || challenge.opponentId !== userId || challenge.status !== 'pending') {
            await db.run('ROLLBACK');
            return res.status(404).json({ message: 'Challenge not found or you are not the opponent.' });
        }

        // Update challenge status
        await db.run(`UPDATE challenges SET status = 'accepted' WHERE id = ?`, challengeId);

        // Create a new match with 'live' status
        const matchId = randomUUID();
        await db.run(
            `INSERT INTO matches (id, playerAId, playerBId, status, timestamp) VALUES (?, ?, ?, 'live', ?)`,
            matchId, challenge.challengerId, challenge.opponentId, Date.now()
        );
        
        await db.run('COMMIT');
        res.status(200).json({ message: 'Challenge accepted. Match created.', matchId });

    } catch (error) {
        if (req.db) await req.db.run('ROLLBACK');
        console.error('Failed to accept challenge:', error);
        res.status(500).json({ message: 'Failed to accept challenge' });
    }
});

// POST to reject a challenge
router.post('/:id/reject', authenticateToken, async (req, res) => {
    const challengeId = req.params.id;
    const userId = req.user!.id;

    try {
        const db = req.db!;
        const challenge = await db.get('SELECT * FROM challenges WHERE id = ?', challengeId);

        // Allow either challenger or opponent to cancel/reject
        if (!challenge || (challenge.opponentId !== userId && challenge.challengerId !== userId) || challenge.status !== 'pending') {
            return res.status(404).json({ message: 'Challenge not found or you cannot reject it.' });
        }

        await db.run(`UPDATE challenges SET status = 'rejected' WHERE id = ?`, challengeId);
        res.status(200).json({ message: 'Challenge rejected.' });

    } catch (error) {
        console.error('Failed to reject challenge:', error);
        res.status(500).json({ message: 'Failed to reject challenge' });
    }
});

export default router;
