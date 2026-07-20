import { Router } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// GET all players
router.get('/', async (req, res) => {
  try {
    // Note: "totalEarned" needs quotes in Postgres because of camelCase
    const players = await pool.query('SELECT * FROM players ORDER BY "totalEarned" DESC');
    res.json(players.rows);
  } catch (error) {
    console.error('Failed to get players:', error);
    res.status(500).json({ message: 'Failed to retrieve players' });
  }
});

// GET a single player by ID (protected)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM players WHERE id = $1', [req.params.id]);
    
    if (result.rows.length > 0) {
      const player = result.rows[0];
      const { password, ...playerWithoutPassword } = player;
      res.json(playerWithoutPassword);
    } else {
      res.status(404).json({ message: 'Player not found' });
    }
  } catch (error) {
    console.error('Failed to get player by ID:', error);
    res.status(500).json({ message: 'Failed to retrieve player' });
  }
});

export default router;
