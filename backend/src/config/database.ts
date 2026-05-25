import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';
import bcrypt from 'bcrypt';

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
      isAdmin BOOLEAN NOT NULL DEFAULT 0,
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
      playerABid INTEGER,
      playerBBid INTEGER,
      jackpotWon BOOLEAN,
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
  const playerTableInfo = await db.all("PRAGMA table_info(players)");
  const matchTableInfo = await db.all("PRAGMA table_info(matches)");

  if (!playerTableInfo.some(col => col.name === 'isAdmin')) {
    console.log("Adding 'isAdmin' column to players table...");
    await db.exec("ALTER TABLE players ADD COLUMN isAdmin BOOLEAN NOT NULL DEFAULT 0");
  }

  if (!matchTableInfo.some(col => col.name === 'jackpotWon')) {
    console.log("Adding 'jackpotWon' column to matches table...");
    await db.exec("ALTER TABLE matches ADD COLUMN jackpotWon BOOLEAN");
  }

  // --- INITIAL STATE ---
  // Seed initial tournament state if it doesn't exist
  const currentState = await db.get("SELECT value FROM system_state WHERE key = 'tournamentState'");
  if (!currentState) {
    const initialTournamentState = {
      currentKingId: null,
      superGamePool: 0,
      queue: [],
    };
    await db.run(
      "INSERT INTO system_state (key, value) VALUES (?, ?)",
      'tournamentState',
      JSON.stringify(initialTournamentState)
    );
  }

  // Seed admin user if it doesn't exist
  const adminExists = await db.get("SELECT id FROM players WHERE isAdmin = 1");
  if (!adminExists) {
    const adminPassword = await bcrypt.hash('admin', 10);
    await db.run(
      `INSERT INTO players (id, name, telegram, password, isAdmin, clutchPoints) 
       VALUES (?, ?, ?, ?, 1, 0)`,
      'admin-user-id', 'Admin', 'admin', adminPassword
    );
  }

  dbInstance = db;
  return db;
};
