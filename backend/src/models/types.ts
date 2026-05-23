export interface Player {
  id: string;             // Уникальный ID (или Telegram ID)
  name: string;
  telegram: string;
  password?: string; // Made optional to avoid breaking changes everywhere at once
  clutchPoints: number;   // Текущий баланс очков для ставок
  totalEarned: number;    // Всего заработано (метрика эффективности)
  totalSpent: number;     // Всего сожжено на аукционах
  maxStreak: number;      // Лучшая серия побед
  currentStreak: number;  // Текущая серия (для триггера Гран-при)
}

export interface Match {
  id: string;
  playerAId: string;
  playerBId: string;
  scoreA: number;
  scoreB: number;
  winnerId: string;
  bidPool: number;        // Сколько всего поинтов было на кону в этом матче
  superGameContribution: number; // 50% от ставки, ушедшие в пул Супер-игры
  timestamp: number;
}

export interface TournamentState {
  currentKingId: string | null;  // Кто сейчас на троне
  superGamePool: number;        // Текущий размер пула Супер-игры
  queue: { playerId: string; bid: number }[]; // Очередь претендентов, отсортированная по bid
}
