import { Router } from 'express';
import { Player } from '../models/types';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { authenticateToken } from '../middleware/authMiddleware';
import { pool } from '../config/database';
import crypto from 'crypto';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';
const SALT_ROUNDS = 10;
// IMPORTANT: User must set this in their .env file
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

// POST /api/auth/telegram - The new primary authentication method
router.post('/telegram', async (req, res) => {
    const { initData } = req.body;
    if (!initData) {
        return res.status(400).json({ message: 'initData is required' });
    }

    try {
        // --- DATA VALIDATION ---
        // TODO: In production, fully validate the initData using the TELEGRAM_BOT_TOKEN
        // This is a simplified validation for now.
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        urlParams.delete('hash');
        const sortedParams = Array.from(urlParams.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        const dataCheckString = sortedParams.map(([key, value]) => `${key}=${value}`).join('\n');
        
        // This validation is for example only and might need adjustment based on real TG data.
        // A proper HMAC validation should be used.
        if (!hash) {
             // For local dev, bypass validation if hash is missing and user is marked as dev
            const user = JSON.parse(urlParams.get('user') || '{}');
            if (process.env.NODE_ENV !== 'development' || !user.id) {
                 return res.status(401).json({ message: 'Invalid Telegram data: Hash missing.' });
            }
        }
        
        const user = JSON.parse(urlParams.get('user') || '{}');
        if (!user.id) {
            return res.status(400).json({ message: 'Invalid user data in initData' });
        }

        // --- UPSERT LOGIC ---
        let player = (await pool.query('SELECT * FROM players WHERE id = $1', [user.id.toString()])).rows[0];

        if (!player) {
            // Register new player
            console.log(`Registering new player: ${user.first_name} (ID: ${user.id})`);
            const newPlayer: Player = {
                id: user.id.toString(),
                name: `${user.first_name} ${user.last_name || ''}`.trim(),
                telegram: user.username || user.id.toString(),
                password: await bcrypt.hash(randomUUID(), SALT_ROUNDS), // Create a dummy password
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
            await pool.query(
                `INSERT INTO players (id, name, telegram, password, "clutchPoints", "totalEarned", "totalSpent", "maxStreak", "currentStreak", "pointsScored", "pointsConceded", "matchesWon", "matchesLost")
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [
                    newPlayer.id, newPlayer.name, newPlayer.telegram, newPlayer.password,
                    newPlayer.clutchPoints, newPlayer.totalEarned, newPlayer.totalSpent,
                    newPlayer.maxStreak, newPlayer.currentStreak, newPlayer.pointsScored,
                    newPlayer.pointsConceded, newPlayer.matchesWon, newPlayer.matchesLost
                ]
            );
            player = newPlayer;
        }

        // --- RETURN JWT ---
        const { password, ...userPayload } = player;
        const token = jwt.sign({ id: player.id, name: player.name }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, player: userPayload });

    } catch (error) {
        console.error('Telegram authentication failed:', error);
        res.status(500).json({ message: 'Internal server error during authentication.' });
    }
});


// POST /api/auth/login - Kept for local admin/dev access
router.post('/login', async (req, res) => {
  const { telegram, password } = req.body;

  if (!telegram || !password) {
    return res.status(400).json({ message: 'Telegram and password are required' });
  }

  try {
    const cleanTelegram = telegram.startsWith('@') ? telegram.substring(1) : telegram;
    const result = await pool.query('SELECT * FROM players WHERE telegram = $1', [cleanTelegram]);
    const player = result.rows[0];

    if (!player || !player.password) {
      return res.status(401).json({ message: 'Authentication failed. Player not found or no password set.' });
    }

    const isMatch = await bcrypt.compare(password, player.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Authentication failed. Incorrect password.' });
    }

    const { password: _, ...userPayload } = player;
    const token = jwt.sign({ id: player.id, name: player.name }, JWT_SECRET, { expiresIn: '1d' });

    res.json({ message: 'Login successful', token, player: userPayload });

  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ message: 'Failed to log in' });
  }
});


// GET /api/auth/validate-token - Validates the token on app load
router.get('/validate-token', authenticateToken, (req, res) => {
  res.status(200).json({ user: req.user });
});

export default router;
