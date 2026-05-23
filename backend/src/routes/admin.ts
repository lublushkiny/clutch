import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { updateTournamentState } from '../utils/tournamentState';

const router = Router();

// POST /api/admin/reset - Resets game state (protected)
router.post('/reset', authenticateToken, async (req, res) => {
  let db = req.db!;
  try {
    await db.run('BEGIN TRANSACTION');

    // 1. Reset all players' clutchPoints to 1000, and streaks to 0
    await db.run('UPDATE players SET clutchPoints = 1000, currentStreak = 0, maxStreak = 0, totalEarned = 0, totalSpent = 0');

    // 2. Clear all match history
    await db.run('DELETE FROM matches');

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
