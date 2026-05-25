import { Router } from 'express';
import { Player } from '../models/types';
import { authenticateToken } from '../middleware/authMiddleware';
import { updateTournamentState } from '../utils/tournamentState';

const router = Router();

// GET all players
router.get('/', async (req, res) => {
  try {
    const db = req.db!;
    const players = await db.all('SELECT * FROM players WHERE isAdmin = 0 ORDER BY totalEarned DESC');
    res.json(players);
  } catch (error) {
    console.error('Failed to get players:', error);
    res.status(500).json({ message: 'Failed to retrieve players' });
  }
});

// GET a single player by ID (protected)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const db = req.db!;
    const player = await db.get<Player>('SELECT * FROM players WHERE id = ?', req.params.id);
    if (player) {
      const { password: _, ...playerWithoutPassword } = player;
      res.json(playerWithoutPassword);
    } else {
      res.status(404).json({ message: 'Player not found' });
    }
  } catch (error) {
    console.error('Failed to get player by ID:', error);
    res.status(500).json({ message: 'Failed to retrieve player' });
  }
});

// POST /api/admin/reset - Resets game state (protected)
router.post('/admin/reset', authenticateToken, async (req, res) => {
  let db = req.db!;
  try {
    await db.run('BEGIN TRANSACTION');

    // 1. Reset all players' clutchPoints to 1000, and streaks to 0
    await db.run('UPDATE players SET clutchPoints = 1000, currentStreak = 0, maxStreak = 0, totalEarned = 0, totalSpent = 0, pointsScored = 0, pointsConceded = 0');

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
