import { Router } from 'express';
import { getDb } from '../config/database';
import { Match, Player, TournamentState } from '../models/types';
import { randomUUID } from 'crypto';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Helper function to get and parse the tournament state
const getTournamentState = async (db: Awaited<ReturnType<typeof getDb>>): Promise<TournamentState> => {
  const stateRow = await db.get("SELECT value FROM system_state WHERE key = 'tournamentState'");
  return JSON.parse(stateRow.value);
};

// Helper function to update the tournament state
const updateTournamentState = async (db: Awaited<ReturnType<typeof getDb>>, state: TournamentState) => {
  await db.run("UPDATE system_state SET value = ? WHERE key = 'tournamentState'", JSON.stringify(state));
};

// GET current tournament state
router.get('/state', async (req, res) => {
  try {
    const db = await getDb();
    const state = await getTournamentState(db);
    res.json(state);
  } catch (error) {
    console.error('Failed to get tournament state:', error);
    res.status(500).json({ message: 'Failed to retrieve tournament state' });
  }
});

// GET all matches
router.get('/matches', authenticateToken, async (req, res) => {
    try {
      const db = await getDb();
      // Join with players to get winner's name
      const matches = await db.all(`
        SELECT 
          m.*, 
          p_a.name as playerAName,
          p_b.name as playerBName
        FROM matches m
        JOIN players p_a ON m.playerAId = p_a.id
        JOIN players p_b ON m.playerBId = p_b.id
        ORDER BY m.timestamp DESC
      `);
      res.json(matches);
    } catch (error) {
      console.error('Failed to get matches:', error);
      res.status(500).json({ message: 'Failed to retrieve matches' });
    }
});

// POST /api/auction/bid — Игрок тратит X поинтов.
router.post('/auction/bid', authenticateToken, async (req, res) => {
  const { bid } = req.body;
  const playerId = req.user?.id; // Get playerId from authenticated user

  if (!playerId || !bid) {
    return res.status(400).json({ message: 'Bid amount is required' });
  }

  const db = await getDb();
  try {
    await db.run('BEGIN TRANSACTION');

    const player = await db.get<Player>('SELECT * FROM players WHERE id = ?', playerId);
    if (!player) {
      await db.run('ROLLBACK');
      return res.status(404).json({ message: 'Player not found' });
    }
    if (player.clutchPoints < bid) {
      await db.run('ROLLBACK');
      return res.status(400).json({ message: 'Insufficient clutch points' });
    }

    // Списываем из его clutchPoints, добавляем в totalSpent.
    const newClutchPoints = player.clutchPoints - bid;
    const newTotalSpent = player.totalSpent + bid;
    await db.run('UPDATE players SET clutchPoints = ?, totalSpent = ? WHERE id = ?', newClutchPoints, newTotalSpent, playerId);

    // Помещаем в state.queue. Сортируем очередь по убыванию bid.
    const state = await getTournamentState(db);

    if (state.currentKingId === playerId) {
        await db.run('ROLLBACK');
        return res.status(400).json({ message: 'King cannot join the queue.' });
    }

    if (state.queue.some(p => p.playerId === playerId)) {
        await db.run('ROLLBACK');
        return res.status(400).json({ message: 'Player is already in the queue.' });
    }

    state.queue.push({ playerId, bid });
    state.queue.sort((a, b) => b.bid - a.bid);
    await updateTournamentState(db, state);

    await db.run('COMMIT');
    res.status(200).json(state);
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Failed to process bid:', error);
    res.status(500).json({ message: 'Failed to process bid' });
  }
});

// POST /api/matches/resolve — Фиксация результата матча
router.post('/matches/resolve', authenticateToken, async (req, res) => {
    const { winnerId } = req.body;
    if (!winnerId) {
        return res.status(400).json({ message: 'Winner ID is required' });
    }

    const db = await getDb();
    try {
        await db.run('BEGIN TRANSACTION');
        const state = await getTournamentState(db);

        if (state.queue.length === 0) {
            await db.run('ROLLBACK');
            return res.status(400).json({ message: 'No challenger in the queue' });
        }

        const challenger = state.queue.shift()!;
        const king = await db.get<Player>('SELECT * FROM players WHERE id = ?', state.currentKingId); // This might be null if no current king
        const challengerPlayer = await db.get<Player>('SELECT * FROM players WHERE id = ?', challenger.playerId);
        
        // Determine playerA and playerB based on the match type from frontend
        // If king exists, it's king vs challenger.
        // If king does not exist, it's challenger1 vs challenger2.
        // The `winnerId` comes from the frontend, which already knows who won.

        // If there's no current king, the challenger is actually player1 fighting player2 for the throne.
        // The winner becomes the new king, the loser just loses.
        if (!state.currentKingId) {
            const player1 = king; // This would be the 'firstChallenger' from frontend's perspective (if no king)
            const player2 = challengerPlayer; // This would be the 'secondChallenger' from frontend's perspective (if no king)

            // The winner becomes the new king. The other player just loses.
            state.currentKingId = winnerId;
            const newKing = await db.get<Player>('SELECT * FROM players WHERE id = ?', winnerId);
            if (newKing) {
                await db.run('UPDATE players SET currentStreak = 1 WHERE id = ?', newKing.id);
            }
            // The loser (other challenger) just loses and doesn't get a streak reset or anything special.
            // No bid pool or grand prize contribution for challenger vs challenger match. This is assumed by absence of bidPool/grandPrizeContribution on this path.
            
            await updateTournamentState(db, state);
            await db.run('COMMIT');
            return res.status(200).json({ message: `${newKing?.name} is the new King!`, newState: state });
        }
        
        // If there is a king, it's king vs challenger match as before
        const bidPool = challenger.bid;
        const grandPrizeContribution = Math.floor(bidPool * 0.5);
        const reward = bidPool - grandPrizeContribution;

        state.grandPrizePool += grandPrizeContribution;
        
        if (!king || !challengerPlayer) {
             await db.run('ROLLBACK');
             return res.status(404).json({ message: 'Could not find king or challenger' });
        }

        // The previous King and Challenger are already fetched by `king` and `challengerPlayer`

        const loserId = winnerId === king.id ? challengerPlayer.id : king.id;

        // Update winner stats
        const winner = winnerId === king.id ? king : challengerPlayer;
        let jackpotWon = false;

        if (winnerId === king.id) { // King wins
            winner.currentStreak++;
            if (winner.currentStreak === 3 || winner.currentStreak === 5) {
                winner.clutchPoints += state.grandPrizePool;
                winner.totalEarned += state.grandPrizePool;
                state.grandPrizePool = 0;
                jackpotWon = true;
            }
            winner.clutchPoints += reward;
            winner.totalEarned += reward;
        } else { // Challenger wins and becomes the new king
            winner.currentStreak = 1;
            winner.clutchPoints += reward;
            winner.totalEarned += reward;
            state.currentKingId = winner.id;
            // Reset old king's streak
            await db.run('UPDATE players SET currentStreak = 0 WHERE id = ?', king.id);
        }

        if (winner.currentStreak > winner.maxStreak) {
            winner.maxStreak = winner.currentStreak;
        }
        
        await db.run(
            'UPDATE players SET clutchPoints = ?, totalEarned = ?, currentStreak = ?, maxStreak = ? WHERE id = ?',
            winner.clutchPoints, winner.totalEarned, winner.currentStreak, winner.maxStreak, winner.id
        );

        // Record the match
        const match: Match = {
            id: randomUUID(),
            playerAId: king.id,
            playerBId: challengerPlayer.id,
            scoreA: winnerId === king.id ? 1 : 0, // Simplified score
            scoreB: winnerId === challengerPlayer.id ? 1 : 0,
            winnerId,
            bidPool,
            grandPrizeContribution,
            timestamp: Date.now(),
        };
        await db.run(
            `INSERT INTO matches (id, playerAId, playerBId, scoreA, scoreB, winnerId, bidPool, grandPrizeContribution, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            match.id, match.playerAId, match.playerBId, match.scoreA, match.scoreB, match.winnerId, match.bidPool, match.grandPrizeContribution, match.timestamp
        );

        await updateTournamentState(db, state);
        await db.run('COMMIT');

        res.json({
            message: `Match resolved. Winner: ${winner.name}.`,
            jackpotWon,
            newState: state,
        });

    } catch (error) {
        await db.run('ROLLBACK');
        console.error('Failed to resolve match:', error);
        res.status(500).json({ message: 'Failed to resolve match' });
    }
});

export default router;
