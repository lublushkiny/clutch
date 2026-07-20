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
  pointsScored: number;
  pointsConceded: number;
  matchesWon: number;
  matchesLost: number;
}

export interface Match {
  id: string;
  playerAId: string;
  playerBId: string;
  scoreA: number | null;
  scoreB: number | null;
  winnerId: string | null;
  status: 'live' | 'completed';
  bidPool: number | null;
  playerABid: number | null;
  playerBBid: number | null;
  jackpotWon: boolean | null;
  videoUrl: string | null;
  timestamp: number;
}

export interface TournamentState {
  currentKingId: string | null;  // Кто сейчас на троне
  superGamePool: number;        // Текущий размер пула Супер-игры
  queue: { playerId: string; bid: number }[]; // Очередь претендентов, отсортированная по bid
}
