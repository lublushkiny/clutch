import express from 'express';
import cors from 'cors';
import { getDb } from './config/database';
import playerRoutes from './routes/players';
import matchRoutes from './routes/matches';
import authRoutes from './routes/auth';

const app = express();
const PORT = process.env.PORT || 3001;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api', matchRoutes);

// --- SERVER STARTUP ---
const startServer = async () => {
  try {
    await getDb(); // Initialize database connection and schema
    console.log('Database connected and schema verified.');
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
