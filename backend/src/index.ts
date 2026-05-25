import express from 'express';
import cors from 'cors';
import { getDb } from './config/database';
import playerRoutes from './routes/players';
import matchRoutes from './routes/matches';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin'; // Import admin routes
import { dbMiddleware } from './middleware/dbMiddleware'; // Import dbMiddleware

const app = express();
const PORT = process.env.PORT || 3001;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(dbMiddleware); // Use dbMiddleware here

// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes); // Use admin routes
app.use('/api/players', playerRoutes);
app.use('/api', matchRoutes);

// --- SERVER STARTUP ---
const startServer = async () => {
  try {
    await getDb(); // Initialize database connection and schema
    console.log('Database connected and schema verified.');
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Server is running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
