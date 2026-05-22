import { Router } from 'express';
import { getDb } from '../config/database';
import { Player } from '../models/types';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key'; // Use an environment variable in production
const SALT_ROUNDS = 10;

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, telegram, password } = req.body;

  if (!name || !telegram || !password) {
    return res.status(400).json({ message: 'Name, telegram, and password are required' });
  }

  let cleanTelegram = telegram.startsWith('@') ? telegram.substring(1) : telegram;

  try {
    const db = await getDb();

    // Check if player already exists
    const existingPlayer = await db.get('SELECT id FROM players WHERE telegram = ?', cleanTelegram);
    if (existingPlayer) {
      return res.status(409).json({ message: 'A player with this telegram handle already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newPlayer: Omit<Player, 'id'> & { id: string } = {
      id: randomUUID(),
      name,
      telegram: cleanTelegram,
      password: hashedPassword,
      clutchPoints: 1000, // Starting points
      totalEarned: 0,
      totalSpent: 0,
      maxStreak: 0,
      currentStreak: 0,
    };

    await db.run(
      `INSERT INTO players (id, name, telegram, password, clutchPoints, totalEarned, totalSpent, maxStreak, currentStreak)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      newPlayer.id,
      newPlayer.name,
      newPlayer.telegram,
      newPlayer.password,
      newPlayer.clutchPoints,
      newPlayer.totalEarned,
      newPlayer.totalSpent,
      newPlayer.maxStreak,
      newPlayer.currentStreak
    );

    res.status(201).json({ message: 'Player registered successfully.' });
  } catch (error) {
    console.error('Registration failed:', error);
    res.status(500).json({ message: 'Failed to register player' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { telegram, password } = req.body;
  let cleanTelegram = telegram.startsWith('@') ? telegram.substring(1) : telegram;

  if (!telegram || !password) {
    return res.status(400).json({ message: 'Telegram and password are required' });
  }

  try {
    const db = await getDb();
    const player = await db.get<Player>('SELECT * FROM players WHERE telegram = ?', cleanTelegram);

    if (!player || !player.password) {
      return res.status(401).json({ message: 'Authentication failed. Player not found or no password set.' });
    }

    const isMatch = await bcrypt.compare(password, player.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Authentication failed. Incorrect password.' });
    }

    // Don't send password back
    const { password: _, ...userPayload } = player;

    const token = jwt.sign({ id: player.id, name: player.name }, JWT_SECRET, { expiresIn: '1d' });

    res.json({
      message: 'Login successful',
      token,
      player: userPayload
    });

  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ message: 'Failed to log in' });
  }
});

export default router;
