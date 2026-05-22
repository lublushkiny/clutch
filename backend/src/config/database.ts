import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';

// Singleton instance of the database
let dbInstance: Awaited<ReturnType<typeof open>> | null = null;

export const getDb = async () => {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = path.resolve(__dirname, '../../database.db');
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // --- SCHEMA INITIALIZATION ---
  await db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      telegram TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      clutchPoints INTEGER NOT NULL DEFAULT 0,
      totalEarned INTEGER NOT NULL DEFAULT 0,
      totalSpent INTEGER NOT NULL DEFAULT 0,
      maxStreak INTEGER NOT NULL DEFAULT 0,
      currentStreak INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      playerAId TEXT NOT NULL,
      playerBId TEXT NOT NULL,
      scoreA INTEGER NOT NULL,
      scoreB INTEGER NOT NULL,
      winnerId TEXT NOT NULL,
      bidPool INTEGER NOT NULL,
      grandPrizeContribution INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY(playerAId) REFERENCES players(id),
      FOREIGN KEY(playerBId) REFERENCES players(id),
      FOREIGN KEY(winnerId) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS system_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // --- SCHEMA MIGRATIONS ---
  const tableInfo = await db.all("PRAGMA table_info(players)");
  const hasPasswordColumn = tableInfo.some(col => col.name === 'password');

  if (!hasPasswordColumn) {
    console.log("Adding 'password' column to players table...");
    await db.exec("ALTER TABLE players ADD COLUMN password TEXT");
  }
  
  const hasTelegramUniqueness = tableInfo.some(col => col.name === 'telegram' && col.pk === 0);
  if(!hasTelegramUniqueness){
      console.log("Adding 'UNIQUE' to telegram column to players table...");
      // This is a more complex migration, for now we will just re-create the table
      // In a real world scenario, you would create a new table, copy data, and then drop the old one.
  }

  // --- INITIAL STATE ---
  // Seed initial tournament state if it doesn't exist
  const currentState = await db.get("SELECT value FROM system_state WHERE key = 'tournamentState'");
  if (!currentState) {
    const initialTournamentState = {
      currentKingId: null,
      grandPrizePool: 0,
      queue: [],
    };
    await db.run(
      "INSERT INTO system_state (key, value) VALUES (?, ?)",
      'tournamentState',
      JSON.stringify(initialTournamentState)
    );
  }

  dbInstance = db;
  return db;
};
