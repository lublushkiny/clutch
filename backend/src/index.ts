import express from 'express';
import cors from 'cors';
import { initializeSchema } from './config/database';
import playerRoutes from './routes/players';
import matchRoutes from './routes/matches';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import challengeRoutes from './routes/challenges';

const app = express();
const PORT = process.env.PORT || 3001;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/matches', matchRoutes); // Changed from /api to /api/matches

// --- SERVER STARTUP ---
const startServer = async () => {
  try {
    await initializeSchema(); // Initialize database schema
    console.log('Database schema verified.');
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Server is running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
