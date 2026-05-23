import { Request, Response, NextFunction } from 'express';
import { getDb } from '../config/database';
import { Database } from 'sqlite'; // Import the Database type from 'sqlite'

// Extend the Express Request interface to include our custom 'db' property
declare global {
  namespace Express {
    interface Request {
      db?: Database; // Database type from sqlite
    }
  }
}

export const dbMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    req.db = await getDb();
    next();
  } catch (error) {
    console.error('Failed to connect to database in dbMiddleware:', error);
    res.status(500).json({ message: 'Database connection error' });
  }
};
