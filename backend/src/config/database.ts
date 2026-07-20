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
      currentStreak INTEGER NOT NULL DEFAULT 0,
      pointsScored INTEGER NOT NULL DEFAULT 0,
      pointsConceded INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      playerAId TEXT NOT NULL,
      playerBId TEXT NOT NULL,
      scoreA INTEGER,
      scoreB INTEGER,
      winnerId TEXT,
      status TEXT NOT NULL DEFAULT 'upcoming', -- upcoming, live, completed
      bidPool INTEGER,
      playerABid INTEGER,
      playerBBid INTEGER,
      jackpotWon BOOLEAN,
      videoUrl TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY(playerAId) REFERENCES players(id),
      FOREIGN KEY(playerBId) REFERENCES players(id),
      FOREIGN KEY(winnerId) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS challenges (
      id TEXT PRIMARY KEY,
      challengerId TEXT NOT NULL,
      opponentId TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, rejected
      timestamp INTEGER NOT NULL,
      FOREIGN KEY(challengerId) REFERENCES players(id),
      FOREIGN KEY(opponentId) REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS system_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gas_logs (
      id TEXT PRIMARY KEY,
      fromPlayerId TEXT NOT NULL,
      toPlayerId TEXT NOT NULL,
      bidAmount INTEGER NOT NULL,
      commissionAmount INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY(fromPlayerId) REFERENCES players(id),
      FOREIGN KEY(toPlayerId) REFERENCES players(id)
    );
  `);

  // --- SCHEMA MIGRATIONS ---
  const playerTableInfo = await db.all("PRAGMA table_info(players)");
  const matchTableInfo = await db.all("PRAGMA table_info(matches)");

  if (!playerTableInfo.some(col => col.name === 'isAdmin')) {
    console.log("Adding 'isAdmin' column to players table...");
    await db.exec("ALTER TABLE players ADD COLUMN isAdmin BOOLEAN NOT NULL DEFAULT 0");
  }

  if (!playerTableInfo.some(col => col.name === 'pointsScored')) {
    console.log("Adding 'pointsScored' column to players table...");
    await db.exec("ALTER TABLE players ADD COLUMN pointsScored INTEGER NOT NULL DEFAULT 0");
  }

  if (!playerTableInfo.some(col => col.name === 'pointsConceded')) {
    console.log("Adding 'pointsConceded' column to players table...");
    await db.exec("ALTER TABLE players ADD COLUMN pointsConceded INTEGER NOT NULL DEFAULT 0");
  }

  if (!matchTableInfo.some(col => col.name === 'jackpotWon')) {
    console.log("Adding 'jackpotWon' column to matches table...");
    await db.exec("ALTER TABLE matches ADD COLUMN jackpotWon BOOLEAN");
  }

  if (!playerTableInfo.some(col => col.name === 'matchesWon')) {
    console.log("Adding 'matchesWon' column to players table...");
    await db.exec("ALTER TABLE players ADD COLUMN matchesWon INTEGER NOT NULL DEFAULT 0");
  }

  if (!playerTableInfo.some(col => col.name === 'matchesLost')) {
    console.log("Adding 'matchesLost' column to players table...");
    await db.exec("ALTER TABLE players ADD COLUMN matchesLost INTEGER NOT NULL DEFAULT 0");
  }
  
  if (!matchTableInfo.some(col => col.name === 'videoUrl')) {
    console.log("Adding 'videoUrl' column to matches table...");
    await db.exec("ALTER TABLE matches ADD COLUMN videoUrl TEXT");
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
