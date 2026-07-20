import { Router } from 'express';
import { Match, Player } from '../models/types';
import { randomUUID } from 'crypto';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

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
        ORDER BY m.status, m.timestamp DESC
      `);
      res.json(matches);
    } catch (error) {
      console.error('Failed to get matches:', error);
      res.status(500).json({ message: 'Failed to retrieve matches' });
    }
});

// POST /api/matches/resolve - Завершение матча участником или админом
router.post('/matches/resolve', authenticateToken, async (req, res) => {
    const { matchId, scoreA, scoreB, videoUrl } = req.body;
    if (!matchId || typeof scoreA !== 'number' || typeof scoreB !== 'number' || scoreA === scoreB) {
        return res.status(400).json({ message: 'Match ID and distinct scores for A and B are required.' });
    }

    const db = req.db!;
    try {
        await db.run('BEGIN TRANSACTION');

        const match = await db.get<Match>(`SELECT * FROM matches WHERE id = ? AND status = 'live'`, matchId);
        if (!match) {
            await db.run('ROLLBACK');
            return res.status(404).json({ message: 'Live match not found.' });
        }

        const authedUserId = req.user!.id;
        const adminUser = await db.get<Player>('SELECT isAdmin FROM players WHERE id = ?', authedUserId);
        const isParticipant = authedUserId === match.playerAId || authedUserId === match.playerBId;

        if (!adminUser?.isAdmin && !isParticipant) {
            await db.run('ROLLBACK');
            return res.status(403).json({ message: 'You are not authorized to resolve this match.' });
        }

        const winnerId = scoreA > scoreB ? match.playerAId : match.playerBId;
        const loserId = scoreA > scoreB ? match.playerBId : match.playerAId;

        const winner = await db.get<Player>('SELECT * FROM players WHERE id = ?', winnerId);
        const loser = await db.get<Player>('SELECT * FROM players WHERE id = ?', loserId);

        if (!winner || !loser) {
            throw new Error('Match participants not found');
        }

        const winnerScore = scoreA > scoreB ? scoreA : scoreB;
        const loserScore = scoreA > scoreB ? scoreB : scoreA;

        winner.matchesWon = (winner.matchesWon || 0) + 1;
        winner.pointsScored = (winner.pointsScored || 0) + winnerScore;
        winner.pointsConceded = (winner.pointsConceded || 0) + loserScore;

        loser.matchesLost = (loser.matchesLost || 0) + 1;
        loser.pointsScored = (loser.pointsScored || 0) + loserScore;
        loser.pointsConceded = (loser.pointsConceded || 0) + winnerScore;

        await db.run('UPDATE players SET matchesWon = ?, pointsScored = ?, pointsConceded = ? WHERE id = ?', winner.matchesWon, winner.pointsScored, winner.pointsConceded, winner.id);
        await db.run('UPDATE players SET matchesLost = ?, pointsScored = ?, pointsConceded = ? WHERE id = ?', loser.matchesLost, loser.pointsScored, loser.pointsConceded, loser.id);

        await db.run(`UPDATE matches SET status = 'completed', scoreA = ?, scoreB = ?, winnerId = ?, videoUrl = ? WHERE id = ?`, scoreA, scoreB, winnerId, videoUrl || null, matchId);

        await db.run('COMMIT');
        res.status(200).json({ message: `Match completed. Winner: ${winner.name}` });

    } catch (error) {
        if (db) await db.run('ROLLBACK');
        console.error('Failed to resolve match:', error);
        res.status(500).json({ message: 'Failed to resolve match' });
    }
});

// PUT /api/matches/edit - Редактирование матча админом
router.put('/matches/edit', authenticateToken, async (req, res) => {
    // 1. Authorization: Admin only
    const adminUser = await req.db!.get<Player>('SELECT isAdmin FROM players WHERE id = ?', req.user!.id);
    if (!adminUser?.isAdmin) {
        return res.status(403).json({ message: 'Only admins can edit matches.' });
    }

    // 2. Input validation
    const { matchId, scoreA, scoreB, videoUrl } = req.body;
    if (!matchId || typeof scoreA !== 'number' || typeof scoreB !== 'number' || scoreA === scoreB) {
        return res.status(400).json({ message: 'Match ID and distinct scores for A and B are required.' });
    }

    const db = req.db!;
    try {
        await db.run('BEGIN TRANSACTION');

        // 3. Find the COMPLETED match
        const oldMatch = await db.get<Match>(`SELECT * FROM matches WHERE id = ? AND status = 'completed'`, matchId);
        if (!oldMatch) {
            await db.run('ROLLBACK');
            return res.status(404).json({ message: 'Completed match not found.' });
        }

        // 4. Get player data
        const playerA = await db.get<Player>('SELECT * FROM players WHERE id = ?', oldMatch.playerAId);
        const playerB = await db.get<Player>('SELECT * FROM players WHERE id = ?', oldMatch.playerBId);
        if(!playerA || !playerB) throw new Error('Player not found for stat recalculation');

        // 5. Revert old stats
        const oldWinnerId = oldMatch.scoreA! > oldMatch.scoreB! ? oldMatch.playerAId : oldMatch.playerBId;
        if (oldWinnerId === playerA.id) {
            playerA.matchesWon -= 1;
            playerB.matchesLost -= 1;
        } else {
            playerB.matchesWon -= 1;
            playerA.matchesLost -= 1;
        }
        playerA.pointsScored -= oldMatch.scoreA!;
        playerA.pointsConceded -= oldMatch.scoreB!;
        playerB.pointsScored -= oldMatch.scoreB!;
        playerB.pointsConceded -= oldMatch.scoreA!;

        // 6. Apply new stats
        const newWinnerId = scoreA > scoreB ? playerA.id : playerB.id;
        if (newWinnerId === playerA.id) {
            playerA.matchesWon += 1;
            playerB.matchesLost += 1;
        } else {
            playerB.matchesWon += 1;
            playerA.matchesLost += 1;
        }
        playerA.pointsScored += scoreA;
        playerA.pointsConceded += scoreB;
        playerB.pointsScored += scoreB;
        playerB.pointsConceded += scoreA;

        // 7. Update player records in DB
        await db.run('UPDATE players SET matchesWon = ?, matchesLost = ?, pointsScored = ?, pointsConceded = ? WHERE id = ?', playerA.matchesWon, playerA.matchesLost, playerA.pointsScored, playerA.pointsConceded, playerA.id);
        await db.run('UPDATE players SET matchesWon = ?, matchesLost = ?, pointsScored = ?, pointsConceded = ? WHERE id = ?', playerB.matchesWon, playerB.matchesLost, playerB.pointsScored, playerB.pointsConceded, playerB.id);

        // 8. Update match record
        await db.run(`UPDATE matches SET scoreA = ?, scoreB = ?, winnerId = ?, videoUrl = ? WHERE id = ?`, scoreA, scoreB, newWinnerId, videoUrl || null, matchId);

        await db.run('COMMIT');
        res.status(200).json({ message: 'Match successfully edited.' });

    } catch (error) {
        if (db) await db.run('ROLLBACK');
        console.error('Failed to edit match:', error);
        res.status(500).json({ message: 'Failed to edit match' });
    }
});


export default router;
