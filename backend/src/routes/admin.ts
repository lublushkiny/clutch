import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { updateTournamentState, getTournamentState } from '../utils/tournamentState';
import { pool } from '../config/database';

const router = Router();

// POST /api/admin/give-gas - Admin gives clutch points to a player
router.post('/give-gas', authenticateToken, async (req, res) => {
    const adminId = req.user?.id;

    if (!adminId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    
    try {
        const adminResult = await pool.query('SELECT "isAdmin" FROM players WHERE id = $1', [adminId]);
        if (adminResult.rowCount === 0 || !adminResult.rows[0].isAdmin) {
            return res.status(403).json({ message: 'Only admins can perform this action.' });
        }

        const { playerId, amount } = req.body;

        if (!playerId || !amount || typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ message: 'Player ID and a positive amount are required.' });
        }

        await pool.query('BEGIN');
        const playerResult = await pool.query('SELECT * FROM players WHERE id = $1', [playerId]);
        
        if (playerResult.rowCount === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ message: 'Player not found.' });
        }
        const player = playerResult.rows[0];

        const newClutchPoints = player.clutchPoints + amount;
        const newTotalEarned = player.totalEarned + amount;

        await pool.query(
            'UPDATE players SET "clutchPoints" = $1, "totalEarned" = $2 WHERE id = $3',
            [newClutchPoints, newTotalEarned, playerId]
        );

        await pool.query('COMMIT');
        res.status(200).json({ message: `Successfully gave ${amount} gas to ${player.name}.` });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Failed to give gas:', error);
        res.status(500).json({ message: 'Failed to give gas.' });
    }
});

// POST /api/admin/reset - Resets game state (protected)
router.post('/reset', authenticateToken, async (req, res) => {
    const adminId = req.user?.id;
    
    try {
        // Verify user is an admin
        const adminResult = await pool.query('SELECT "isAdmin" FROM players WHERE id = $1', [adminId]);
        if (adminResult.rowCount === 0 || !adminResult.rows[0].isAdmin) {
            return res.status(403).json({ message: 'Only admins can perform this action.' });
        }

        await pool.query('BEGIN');

        // 1. Reset all players' stats
        await pool.query('UPDATE players SET "clutchPoints" = 1000, "currentStreak" = 0, "maxStreak" = 0, "totalEarned" = 0, "totalSpent" = 0, "pointsScored" = 0, "pointsConceded" = 0, "matchesWon" = 0, "matchesLost" = 0');

        // 2. Clear all match, challenge, and gas history
        await pool.query('DELETE FROM matches');
        await pool.query('DELETE FROM challenges');
        await pool.query('DELETE FROM gas_logs');

        // 3. Reset tournament state
        const initialTournamentState = {
            currentKingId: null,
            superGamePool: 0,
            queue: [],
        };
        await updateTournamentState(initialTournamentState);
        
        await pool.query('COMMIT');
        res.status(200).json({ message: 'Game state reset successfully.' });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Failed to reset game state:', error);
        res.status(500).json({ message: 'Failed to reset game state.' });
    }
});

export default router;
