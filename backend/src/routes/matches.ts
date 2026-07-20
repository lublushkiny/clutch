import { Router } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// GET all matches
router.get('/', authenticateToken, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          m.*, 
          p_a.name as "playerAName",
          p_b.name as "playerBName"
        FROM matches m
        JOIN players p_a ON m."playerAId" = p_a.id
        JOIN players p_b ON m."playerBId" = p_b.id
        ORDER BY m.status, m.timestamp DESC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Failed to get matches:', error);
      res.status(500).json({ message: 'Failed to retrieve matches' });
    }
});

// POST /api/matches/resolve - Завершение матча участником или админом
router.post('/resolve', authenticateToken, async (req, res) => {
    const { matchId, scoreA, scoreB, videoUrl } = req.body;
    if (!matchId || typeof scoreA !== 'number' || typeof scoreB !== 'number' || scoreA === scoreB) {
        return res.status(400).json({ message: 'Match ID and distinct scores for A and B are required.' });
    }

    try {
        await pool.query('BEGIN');

        const matchResult = await pool.query(`SELECT * FROM matches WHERE id = $1 AND status = 'live'`, [matchId]);
        if (matchResult.rowCount === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ message: 'Live match not found.' });
        }
        const match = matchResult.rows[0];

        const authedUserId = req.user!.id;
        const adminResult = await pool.query('SELECT "isAdmin" FROM players WHERE id = $1', [authedUserId]);
        const isParticipant = authedUserId === match.playerAId || authedUserId === match.playerBId;

        if (adminResult.rows[0]?.isAdmin !== true && !isParticipant) {
            await pool.query('ROLLBACK');
            return res.status(403).json({ message: 'You are not authorized to resolve this match.' });
        }

        const winnerId = scoreA > scoreB ? match.playerAId : match.playerBId;
        
        const winnerResult = await pool.query('SELECT * FROM players WHERE id = $1', [winnerId]);
        const loserResult = await pool.query('SELECT * FROM players WHERE id = $1', [winnerId === match.playerAId ? match.playerBId : match.playerAId]);
        const winner = winnerResult.rows[0];
        const loser = loserResult.rows[0];

        if (!winner || !loser) {
            throw new Error('Match participants not found');
        }

        const winnerScore = scoreA > scoreB ? scoreA : scoreB;
        const loserScore = scoreA > scoreB ? scoreB : scoreA;

        await pool.query('UPDATE players SET "matchesWon" = "matchesWon" + 1, "pointsScored" = "pointsScored" + $1, "pointsConceded" = "pointsConceded" + $2 WHERE id = $3', [winnerScore, loserScore, winner.id]);
        await pool.query('UPDATE players SET "matchesLost" = "matchesLost" + 1, "pointsScored" = "pointsScored" + $1, "pointsConceded" = "pointsConceded" + $2 WHERE id = $3', [loserScore, winnerScore, loser.id]);

        await pool.query(`UPDATE matches SET status = 'completed', "scoreA" = $1, "scoreB" = $2, "winnerId" = $3, "videoUrl" = $4 WHERE id = $5`, [scoreA, scoreB, winnerId, videoUrl || null, matchId]);

        await pool.query('COMMIT');
        res.status(200).json({ message: `Match completed. Winner: ${winner.name}` });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Failed to resolve match:', error);
        res.status(500).json({ message: 'Failed to resolve match' });
    }
});

// PUT /api/matches/edit - Редактирование матча админом
router.put('/edit', authenticateToken, async (req, res) => {
    const adminResult = await pool.query('SELECT "isAdmin" FROM players WHERE id = $1', [req.user!.id]);
    if (adminResult.rowCount === 0 || !adminResult.rows[0].isAdmin) {
        return res.status(403).json({ message: 'Only admins can edit matches.' });
    }

    const { matchId, scoreA, scoreB, videoUrl } = req.body;
    if (!matchId || typeof scoreA !== 'number' || typeof scoreB !== 'number' || scoreA === scoreB) {
        return res.status(400).json({ message: 'Match ID and distinct scores for A and B are required.' });
    }

    try {
        await pool.query('BEGIN');

        const oldMatchResult = await pool.query(`SELECT * FROM matches WHERE id = $1 AND status = 'completed'`, [matchId]);
        if (oldMatchResult.rowCount === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ message: 'Completed match not found.' });
        }
        const oldMatch = oldMatchResult.rows[0];

        const playerAResult = await pool.query('SELECT * FROM players WHERE id = $1', [oldMatch.playerAId]);
        const playerBResult = await pool.query('SELECT * FROM players WHERE id = $1', [oldMatch.playerBId]);
        const playerA = playerAResult.rows[0];
        const playerB = playerBResult.rows[0];
        if(!playerA || !playerB) throw new Error('Player not found for stat recalculation');

        // Revert old stats
        const oldWinnerId = oldMatch.scoreA > oldMatch.scoreB ? oldMatch.playerAId : oldMatch.playerBId;
        if (oldWinnerId === playerA.id) {
            await pool.query('UPDATE players SET "matchesWon" = "matchesWon" - 1 WHERE id = $1', [playerA.id]);
            await pool.query('UPDATE players SET "matchesLost" = "matchesLost" - 1 WHERE id = $1', [playerB.id]);
        } else {
            await pool.query('UPDATE players SET "matchesWon" = "matchesWon" - 1 WHERE id = $1', [playerB.id]);
            await pool.query('UPDATE players SET "matchesLost" = "matchesLost" - 1 WHERE id = $1', [playerA.id]);
        }
        await pool.query('UPDATE players SET "pointsScored" = "pointsScored" - $1, "pointsConceded" = "pointsConceded" - $2 WHERE id = $3', [oldMatch.scoreA, oldMatch.scoreB, playerA.id]);
        await pool.query('UPDATE players SET "pointsScored" = "pointsScored" - $1, "pointsConceded" = "pointsConceded" - $2 WHERE id = $3', [oldMatch.scoreB, oldMatch.scoreA, playerB.id]);

        // Apply new stats
        const newWinnerId = scoreA > scoreB ? playerA.id : playerB.id;
        if (newWinnerId === playerA.id) {
            await pool.query('UPDATE players SET "matchesWon" = "matchesWon" + 1 WHERE id = $1', [playerA.id]);
            await pool.query('UPDATE players SET "matchesLost" = "matchesLost" + 1 WHERE id = $1', [playerB.id]);
        } else {
            await pool.query('UPDATE players SET "matchesWon" = "matchesWon" + 1 WHERE id = $1', [playerB.id]);
            await pool.query('UPDATE players SET "matchesLost" = "matchesLost" + 1 WHERE id = $1', [playerA.id]);
        }
        await pool.query('UPDATE players SET "pointsScored" = "pointsScored" + $1, "pointsConceded" = "pointsConceded" + $2 WHERE id = $3', [scoreA, scoreB, playerA.id]);
        await pool.query('UPDATE players SET "pointsScored" = "pointsScored" + $1, "pointsConceded" = "pointsConceded" + $2 WHERE id = $3', [scoreB, scoreA, playerB.id]);

        // Update match record
        await pool.query(`UPDATE matches SET "scoreA" = $1, "scoreB" = $2, "winnerId" = $3, "videoUrl" = $4 WHERE id = $5`, [scoreA, scoreB, newWinnerId, videoUrl || null, matchId]);

        await pool.query('COMMIT');
        res.status(200).json({ message: 'Match successfully edited.' });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Failed to edit match:', error);
        res.status(500).json({ message: 'Failed to edit match' });
    }
});

export default router;
