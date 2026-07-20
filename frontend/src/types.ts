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
  matchesWon: number;
  matchesLost: number;
  pointsScored: number;
  pointsConceded: number;
}

export interface Challenge {
  id: string;
  challengerId: string;
  opponentId: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: number;
  challengerName?: string; // Optional, for incoming challenges
  opponentName?: string;   // Optional, for outgoing challenges
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
  timestamp: number;
}

export interface TournamentState {
  currentKingId: string | null;  // Кто сейчас на троне
  grandPrizePool: number;        // Текущий размер пула Гран-при
  queue: { playerId: string; bid: number }[]; // Очередь претендентов, отсортированная по bid
}
