import { Router } from 'express';
import { getDb } from '../config/database';
import { Player } from '../models/types';
import { randomUUID } from 'crypto';

const router = Router();

// GET all players
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const players = await db.all('SELECT * FROM players ORDER BY totalEarned DESC');
    res.json(players);
  } catch (error) {
    console.error('Failed to get players:', error);
    res.status(500).json({ message: 'Failed to retrieve players' });
  }
});



export default router;
