import dotenv from 'dotenv';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

// By default, dotenv looks for .env in the current working directory.
// The `npm run dev` script is run from /backend, so it will find /backend/.env
dotenv.config();

// Critical check to ensure the environment variable is loaded.
if (!process.env.DATABASE_URL) {
    console.error("FATAL ERROR: DATABASE_URL is not defined.");
    console.error("Please ensure you have a .env file in the /backend directory with the DATABASE_URL from Vercel.");
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Vercel Postgres requires SSL, but does not allow self-signed certificates
    ssl: {
        rejectUnauthorized: false
    }
});

const initializeSchema = async () => {
    // Note: In Postgres, table and column names are case-insensitive unless quoted.
    // To preserve camelCase from the original SQLite schema, we quote them.
    await pool.query(`
        CREATE TABLE IF NOT EXISTS players (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            telegram TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            "isAdmin" BOOLEAN NOT NULL DEFAULT false,
            "clutchPoints" INTEGER NOT NULL DEFAULT 0,
            "totalEarned" INTEGER NOT NULL DEFAULT 0,
            "totalSpent" INTEGER NOT NULL DEFAULT 0,
            "maxStreak" INTEGER NOT NULL DEFAULT 0,
            "currentStreak" INTEGER NOT NULL DEFAULT 0,
            "pointsScored" INTEGER NOT NULL DEFAULT 0,
            "pointsConceded" INTEGER NOT NULL DEFAULT 0,
            "matchesWon" INTEGER NOT NULL DEFAULT 0,
            "matchesLost" INTEGER NOT NULL DEFAULT 0
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS challenges (
            id TEXT PRIMARY KEY,
            "challengerId" TEXT NOT NULL REFERENCES players(id),
            "opponentId" TEXT NOT NULL REFERENCES players(id),
            status TEXT NOT NULL DEFAULT 'pending',
            timestamp BIGINT NOT NULL
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS matches (
            id TEXT PRIMARY KEY,
            "playerAId" TEXT NOT NULL REFERENCES players(id),
            "playerBId" TEXT NOT NULL REFERENCES players(id),
            "scoreA" INTEGER,
            "scoreB" INTEGER,
            "winnerId" TEXT REFERENCES players(id),
            status TEXT NOT NULL DEFAULT 'upcoming',
            "bidPool" INTEGER,
            "playerABid" INTEGER,
            "playerBBid" INTEGER,
            "jackpotWon" BOOLEAN,
            "videoUrl" TEXT,
            timestamp BIGINT NOT NULL
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS system_state (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS gas_logs (
            id TEXT PRIMARY KEY,
            "fromPlayerId" TEXT NOT NULL REFERENCES players(id),
            "toPlayerId" TEXT NOT NULL REFERENCES players(id),
            "bidAmount" INTEGER NOT NULL,
            "commissionAmount" INTEGER NOT NULL,
            timestamp BIGINT NOT NULL
        );
    `);
    
    // Seed admin user if it doesn't exist
    const adminExists = await pool.query('SELECT id FROM players WHERE "isAdmin" = true');
    if (adminExists.rowCount === 0) {
        console.log('Seeding admin user...');
        const adminPassword = await bcrypt.hash('admin', 10);
        await pool.query(
            `INSERT INTO players (id, name, telegram, password, "isAdmin", "clutchPoints", "totalEarned", "totalSpent", "maxStreak", "currentStreak", "pointsScored", "pointsConceded", "matchesWon", "matchesLost") 
             VALUES ($1, $2, $3, $4, true, 1000, 0, 0, 0, 0, 0, 0, 0)`,
            ['admin-user-id', 'Admin', 'admin', adminPassword]
        );
    }

    // Seed initial tournament state
    const stateExists = await pool.query("SELECT key FROM system_state WHERE key = 'tournamentState'");
    if(stateExists.rowCount === 0) {
        console.log('Seeding initial tournament state...');
        const initialTournamentState = {
            currentKingId: null,
            superGamePool: 0,
            queue: [],
        };
        await pool.query(
            `INSERT INTO system_state (key, value) VALUES ('tournamentState', $1)`,
            [JSON.stringify(initialTournamentState)]
        );
    }
};

export { pool, initializeSchema };
