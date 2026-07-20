import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { updateTournamentState } from '../utils/tournamentState';

const router = Router();

// POST /api/admin/give-gas - Admin gives clutch points to a player
router.post('/give-gas', authenticateToken, async (req, res) => {
    const adminId = req.user?.id;

    if (!adminId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    let db = req.db!;
    
    // First, verify the user is an admin
    const adminUser = await db.get('SELECT * FROM players WHERE id = ?', adminId);
    if (!adminUser || !adminUser.isAdmin) {
        return res.status(403).json({ message: 'Only admins can perform this action.' });
    }

    const { playerId, amount } = req.body;

    if (!playerId || !amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: 'Player ID and a positive amount are required.' });
    }

    try {
        await db.run('BEGIN TRANSACTION');

        const player = await db.get('SELECT * FROM players WHERE id = ?', playerId);
        if (!player) {
            await db.run('ROLLBACK');
            return res.status(404).json({ message: 'Player not found.' });
        }

        const newClutchPoints = player.clutchPoints + amount;
        const newTotalEarned = player.totalEarned + amount;

        await db.run(
            'UPDATE players SET clutchPoints = ?, totalEarned = ? WHERE id = ?',
            newClutchPoints,
            newTotalEarned,
            playerId
        );

        await db.run('COMMIT');
        res.status(200).json({ message: `Successfully gave ${amount} gas to ${player.name}.` });
    } catch (error) {
        if (db) {
            await db.run('ROLLBACK');
        }
        console.error('Failed to give gas:', error);
        res.status(500).json({ message: 'Failed to give gas.' });
    }
});

// POST /api/admin/reset - Resets game state (protected)
router.post('/reset', authenticateToken, async (req, res) => {
  let db = req.db!;
  try {
    await db.run('BEGIN TRANSACTION');

    // 1. Reset all players' stats
    await db.run('UPDATE players SET clutchPoints = 1000, currentStreak = 0, maxStreak = 0, totalEarned = 0, totalSpent = 0, pointsScored = 0, pointsConceded = 0, matchesWon = 0, matchesLost = 0');

    // 2. Clear all match and gas history
    await db.run('DELETE FROM matches');
    await db.run('DELETE FROM gas_logs');

    // 3. Reset tournament state
    const initialTournamentState = {
      currentKingId: null,
      superGamePool: 0,
      queue: [],
    };
    await updateTournamentState(db, initialTournamentState);
    
    await db.run('COMMIT');
    res.status(200).json({ message: 'Game state reset successfully.' });
  } catch (error) {
    if (db) {
      await db.run('ROLLBACK');
    }
    console.error('Failed to reset game state:', error);
    res.status(500).json({ message: 'Failed to reset game state.' });
  }
});

export default router;
