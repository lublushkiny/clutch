import { open } from 'sqlite';
import type { TournamentState } from '../models/types';

export const getTournamentState = async (db: Awaited<ReturnType<typeof open>>): Promise<TournamentState> => {
  const stateRow = await db.get("SELECT value FROM system_state WHERE key = 'tournamentState'");
  return JSON.parse(stateRow.value);
};

export const updateTournamentState = async (db: Awaited<ReturnType<typeof open>>, state: TournamentState) => {
  await db.run("UPDATE system_state SET value = ? WHERE key = 'tournamentState'", JSON.stringify(state));
};
