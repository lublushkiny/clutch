export interface Player {
  id: string;
  name: string;
  telegram: string;
  password?: string;
  isAdmin?: boolean;
  clutchPoints: number;
  totalEarned: number;
  totalSpent: number;
  maxStreak: number;
  currentStreak: number;
  // Fields for detailed stats, to be calculated by a query
  matchesWon?: number;
  matchesLost?: number;
  pointsScored?: number;
  pointsConceded?: number;
}

export interface Match {
  id: string;
  playerAId: string;
  playerBId: string;
  playerABid?: number; // Add bid info to match
  playerBBid?: number; // Add bid info to match
  scoreA: number;
  scoreB: number;
  winnerId: string;
  bidPool: number;
  superGameContribution: number;
  jackpotWon?: number;
  timestamp: number;
}

export interface TournamentState {
  currentKingId: string | null;  // Кто сейчас на троне
  superGamePool: number;        // Текущий размер пула Супер-игры
  queue: { playerId: string; bid: number }[]; // Очередь претендентов, отсортированная по bid
}
