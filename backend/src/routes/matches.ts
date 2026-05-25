import { Router } from 'express';
import { Match, Player } from '../models/types';
import { randomUUID } from 'crypto';
import { authenticateToken } from '../middleware/authMiddleware';
import { getTournamentState, updateTournamentState } from '../utils/tournamentState';

const router = Router();

// GET current tournament state
router.get('/state', async (req, res) => {
  try {
    const db = req.db!;
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
      const db = req.db!;
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
  const playerId = req.user?.id;
  let db = req.db!;

  if (!playerId || !bid) {
    return res.status(400).json({ message: 'Bid amount is required' });
  }

  try {
    await db.run('BEGIN TRANSACTION');

    const player = await db.get<Player>('SELECT * FROM players WHERE id = ?', playerId);
    if (!player) {
      await db.run('ROLLBACK');
      return res.status(404).json({ message: 'Player not found' });
    }
    if(player.isAdmin) {
        await db.run('ROLLBACK');
        return res.status(403).json({ message: 'Admins cannot place bids.' });
    }
    if (player.clutchPoints < bid) {
      await db.run('ROLLBACK');
      return res.status(400).json({ message: 'Insufficient clutch points' });
    }

    const newClutchPoints = player.clutchPoints - bid;
    const newTotalSpent = player.totalSpent + bid;
    await db.run('UPDATE players SET clutchPoints = ?, totalSpent = ? WHERE id = ?', newClutchPoints, newTotalSpent, playerId);

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
    if (db) {
      await db.run('ROLLBACK');
    }
    console.error('Failed to process bid:', error);
    res.status(500).json({ message: 'Failed to process bid' });
  }
});

// POST /api/matches/resolve — Фиксация результата матча
router.post('/matches/resolve', authenticateToken, async (req, res) => {
    const user = await req.db!.get<Player>('SELECT * FROM players WHERE id = ?', req.user!.id);
    if (!user || !user.isAdmin) {
        return res.status(403).json({ message: 'Only admins can resolve matches.' });
    }

    const { winnerId } = req.body;
    let db = req.db!;
    if (!winnerId) {
        return res.status(400).json({ message: 'Winner ID is required' });
    }

    try {
        await db.run('BEGIN TRANSACTION');
        let state = await getTournamentState(db);
        const currentKing = await db.get<Player>('SELECT * FROM players WHERE id = ?', state.currentKingId);

        if (state.queue.length === 0) {
            return res.status(400).json({ message: 'No challenger in the queue' });
        }

        // Case 1: No king, battle for the throne (Winner gets nothing, entire bid pool to Super Game)
        if (!currentKing) {
            if (state.queue.length < 2) {
                return res.status(400).json({ message: 'Not enough challengers to determine a new king.' });
            }
            const p1Queue = state.queue.shift()!;
            const p2Queue = state.queue.shift()!;
            
            const p1Data = await db.get<Player>('SELECT * FROM players WHERE id = ?', p1Queue.playerId);
            const p2Data = await db.get<Player>('SELECT * FROM players WHERE id = ?', p2Queue.playerId);

            if (!p1Data || !p2Data) {
                throw new Error('Challenger data not found');
            }

            const winnerData = (winnerId === p1Data.id) ? p1Data : p2Data;
            const loserData = (winnerId === p1Data.id) ? p2Data : p1Data;
            
            winnerData.pointsScored += 1;
            loserData.pointsConceded += 1;
            
            await db.run(
                'UPDATE players SET pointsScored = ?, pointsConceded = ? WHERE id = ?',
                winnerData.pointsScored, winnerData.pointsConceded, winnerData.id
            );
            await db.run(
                'UPDATE players SET pointsScored = ?, pointsConceded = ? WHERE id = ?',
                loserData.pointsScored, loserData.pointsConceded, loserData.id
            );
            
            const bidPool = p1Queue.bid + p2Queue.bid;
            const superGameContribution = bidPool; // The entire pool goes to super game

            state.superGamePool += superGameContribution;
            console.log(`[DEBUG] Case 1 (Throne Battle): superGameContribution=${superGameContribution}, state.superGamePool=${state.superGamePool}`);
            
            // Winner becomes king, but gets no reward from this match
            // Only update currentStreak and maxStreak, points remain unchanged
            winnerData.currentStreak = 1;
            if (winnerData.currentStreak > winnerData.maxStreak) {
                winnerData.maxStreak = winnerData.currentStreak;
            }
            await db.run(
                'UPDATE players SET currentStreak = ?, maxStreak = ? WHERE id = ?',
                winnerData.currentStreak, winnerData.maxStreak, winnerData.id
            );

            state.currentKingId = winnerId;
            state.queue = state.queue.filter(p => p.playerId !== winnerData.id && p.playerId !== loserData.id);
            
            const match: Match = {
                id: randomUUID(),
                playerAId: p1Data.id,
                playerBId: p2Data.id,
                playerABid: p1Queue.bid,
                playerBBid: p2Queue.bid,
                scoreA: winnerId === p1Data.id ? 1 : 0,
                scoreB: winnerId === p2Data.id ? 1 : 0,
                winnerId,
                bidPool,
                superGameContribution,
                jackpotWon: 0, // No jackpot won in this scenario
                timestamp: Date.now(),
            };
            await db.run(
                `INSERT INTO matches (id, playerAId, playerBId, playerABid, playerBBid, scoreA, scoreB, winnerId, bidPool, superGameContribution, jackpotWon, timestamp)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                match.id, match.playerAId, match.playerBId, match.playerABid, match.playerBBid, match.scoreA, match.scoreB, match.winnerId, match.bidPool, match.superGameContribution, match.jackpotWon, match.timestamp
            );

            await updateTournamentState(db, state);
            await db.run('COMMIT');

            const { password: _, ...winnerWithoutPassword } = winnerData;
            return res.status(200).json({ message: `${winnerData.name} is the new King!`, newState: state, winner: winnerWithoutPassword });
        }

        // Case 2: King vs Challenger
        const challengerQueue = state.queue.shift()!;
        const challengerPlayer = await db.get<Player>('SELECT * FROM players WHERE id = ?', challengerQueue.playerId);

        if (!challengerPlayer) {
            throw new Error('Challenger not found');
        }

        const bidPool = challengerQueue.bid;
        const kingReward = Math.floor(bidPool * 0.5); // King always gets half the challenger's bid
        const superGameContribution = bidPool - kingReward;

        // Give currentKing their reward immediately
        currentKing.clutchPoints += kingReward;
        currentKing.totalEarned += kingReward;
        state.superGamePool += superGameContribution;
        
        console.log(`[DEBUG] Case 2: kingReward=${kingReward}, superGameContribution=${superGameContribution}, state.superGamePool_before_jackpot_check=${state.superGamePool}`);

        await db.run(
            'UPDATE players SET clutchPoints = ?, totalEarned = ? WHERE id = ?',
            currentKing.clutchPoints, currentKing.totalEarned, currentKing.id
        );

        let jackpotWonAmount = 0; // Amount for jackpot if won
        const loserId = (winnerId === currentKing.id) ? challengerPlayer.id : currentKing.id;
        const winner = (winnerId === currentKing.id) ? currentKing : challengerPlayer;
        const loser = (winnerId === currentKing.id) ? challengerPlayer : currentKing;

        winner.pointsScored += 1;
        loser.pointsConceded += 1;

        await db.run(
            'UPDATE players SET pointsScored = ?, pointsConceded = ? WHERE id = ?',
            winner.pointsScored, winner.pointsConceded, winner.id
        );
        await db.run(
            'UPDATE players SET pointsScored = ?, pointsConceded = ? WHERE id = ?',
            loser.pointsScored, loser.pointsConceded, loser.id
        );

        if (winner.id === currentKing.id) { // King wins
            winner.currentStreak++;
             if (winner.currentStreak > 0 && winner.currentStreak % 3 === 0) {
                jackpotWonAmount = state.superGamePool; // Capture the amount BEFORE resetting
                winner.clutchPoints += jackpotWonAmount;
                winner.totalEarned += jackpotWonAmount;
                state.superGamePool = 0;
                console.log(`[DEBUG] Jackpot won: ${jackpotWonAmount}, winner.clutchPoints=${winner.clutchPoints}`);
            }
        } else { // Challenger wins and becomes new king
            await db.run('UPDATE players SET currentStreak = 0 WHERE id = ?', currentKing.id); // Reset old king's streak
            winner.currentStreak = 1;
            state.currentKingId = winner.id;
        }

        if (winner.currentStreak > winner.maxStreak) {
            winner.maxStreak = winner.currentStreak;
        }

        await db.run(
            'UPDATE players SET currentStreak = ?, maxStreak = ? WHERE id = ?',
            winner.currentStreak, winner.maxStreak, winner.id
        );
        
        state.queue = state.queue.filter(p => p.playerId !== loserId);
        
        const match: Match = {
            id: randomUUID(),
            playerAId: currentKing.id,
            playerBId: challengerPlayer.id,
            playerABid: 0, // King doesn't bid
            playerBBid: challengerQueue.bid,
            scoreA: winnerId === currentKing.id ? 1 : 0,
            scoreB: winnerId === challengerPlayer.id ? 1 : 0,
            winnerId,
            bidPool,
            superGameContribution,
            jackpotWon: jackpotWonAmount, // Use the captured amount
            timestamp: Date.now(),
        };
         await db.run(
            `INSERT INTO matches (id, playerAId, playerBId, playerABid, playerBBid, scoreA, scoreB, winnerId, bidPool, superGameContribution, jackpotWon, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            match.id, match.playerAId, match.playerBId, match.playerABid, match.playerBBid, match.scoreA, match.scoreB, match.winnerId, match.bidPool, match.superGameContribution, match.jackpotWon, match.timestamp
        );
        await updateTournamentState(db, state);
        await db.run('COMMIT');

        const { password: _, ...winnerWithoutPassword } = winner;
        res.json({ message: `Match resolved. Winner: ${winner.name}.`, winner: winnerWithoutPassword });

    } catch (error) {
        if (db) await db.run('ROLLBACK');
        console.error('Failed to resolve match:', error);
        res.status(500).json({ message: 'Failed to resolve match' });
    }
});

export default router;
