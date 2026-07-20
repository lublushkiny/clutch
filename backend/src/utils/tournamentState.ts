import { pool } from '../config/database';
import type { TournamentState } from '../models/types';

export const getTournamentState = async (): Promise<TournamentState> => {
  const result = await pool.query("SELECT value FROM system_state WHERE key = 'tournamentState'");
  if (result.rows.length === 0) {
      throw new Error("Tournament state not found in database.");
  }
  return JSON.parse(result.rows[0].value);
};

export const updateTournamentState = async (state: TournamentState) => {
  await pool.query("UPDATE system_state SET value = $1 WHERE key = 'tournamentState'", [JSON.stringify(state)]);
};
