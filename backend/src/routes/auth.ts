import { Router } from 'express';
import { Player } from '../models/types';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';
const SALT_ROUNDS = 10;

// GET /api/auth/validate-token - Validates the token on app load
router.get('/validate-token', authenticateToken, (req, res) => {
  res.status(200).json({ user: req.user });
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, telegram, password } = req.body;
  const db = req.db!;

  if (!name || !telegram || !password) {
    return res.status(400).json({ message: 'Name, telegram, and password are required' });
  }

  try {
    const cleanTelegram = telegram.startsWith('@') ? telegram.substring(1) : telegram;
    const existingPlayer = await db.get('SELECT id FROM players WHERE telegram = ?', cleanTelegram);
    if (existingPlayer) {
      return res.status(409).json({ message: 'A player with this telegram handle already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newPlayer: Player = {
      id: randomUUID(),
      name,
      telegram: cleanTelegram,
      password: hashedPassword,
      clutchPoints: 1000,
      totalEarned: 0,
      totalSpent: 0,
      maxStreak: 0,
      currentStreak: 0,
      pointsScored: 0,
      pointsConceded: 0,
      matchesWon: 0,
      matchesLost: 0,
    };

    await db.run(
      `INSERT INTO players (id, name, telegram, password, clutchPoints, totalEarned, totalSpent, maxStreak, currentStreak, pointsScored, pointsConceded, matchesWon, matchesLost)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      newPlayer.id,
      newPlayer.name,
      newPlayer.telegram,
      newPlayer.password,
      newPlayer.clutchPoints,
      newPlayer.totalEarned,
      newPlayer.totalSpent,
      newPlayer.maxStreak,
      newPlayer.currentStreak,
      newPlayer.pointsScored,
      newPlayer.pointsConceded,
      newPlayer.matchesWon,
      newPlayer.matchesLost
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
  const db = req.db!;

  if (!telegram || !password) {
    return res.status(400).json({ message: 'Telegram and password are required' });
  }

  try {
    const cleanTelegram = telegram.startsWith('@') ? telegram.substring(1) : telegram;
    const player = await db.get<Player>('SELECT * FROM players WHERE telegram = ?', cleanTelegram);

    if (!player || !player.password) {
      return res.status(401).json({ message: 'Authentication failed. Player not found or no password set.' });
    }

    const isMatch = await bcrypt.compare(password, player.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Authentication failed. Incorrect password.' });
    }

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
