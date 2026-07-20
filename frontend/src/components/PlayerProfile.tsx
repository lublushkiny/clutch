import React, { useState, useEffect } from 'react';
import type { Player, Challenge, Match } from '../types';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

interface PlayerProfileProps {
  players: Player[];
  setActiveView: (view: string) => void;
}

const PlayerProfile: React.FC<PlayerProfileProps> = ({ players, setActiveView }) => {
  const { user } = useAuth();
  const [pendingChallengePlayerIds, setPendingChallengePlayerIds] = useState(new Set<string>());
  const [liveMatchPlayerIds, setLiveMatchPlayerIds] = useState(new Set<string>());

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        // Fetch both challenges and matches in parallel
        const [challengesRes, matchesRes] = await Promise.all([
          axios.get<{ incoming: Challenge[], outgoing: Challenge[] }>('/api/challenges'),
          axios.get<Match[]>('/api/matches')
        ]);

        // Process challenges
        const challengeIds = new Set<string>();
        challengesRes.data.incoming.forEach(c => challengeIds.add(c.challengerId));
        challengesRes.data.outgoing.forEach(c => challengeIds.add(c.opponentId));
        setPendingChallengePlayerIds(challengeIds);

        // Process live matches
        const liveMatchIds = new Set<string>();
        matchesRes.data
          .filter(m => m.status === 'live')
          .forEach(m => {
            if (m.playerAId === user.id) {
              liveMatchIds.add(m.playerBId);
            } else if (m.playerBId === user.id) {
              liveMatchIds.add(m.playerAId);
            }
          });
        setLiveMatchPlayerIds(liveMatchIds);

      } catch (error) {
        console.error("Failed to fetch data for leaderboard view:", error);
      }
    };

    fetchData();
  }, [user, players]);

  const handleChallenge = async (opponent: Player) => {
    if (!window.confirm(`Вы уверены, что хотите бросить вызов ${opponent.name}?`)) {
      return;
    }
    try {
      const response = await axios.post('/api/challenges', { opponentId: opponent.id });
      alert(response.data.message || 'Вызов успешно отправлен!');
      setPendingChallengePlayerIds(prev => new Set(prev).add(opponent.id));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Не удалось отправить вызов.';
      alert(`Ошибка: ${errorMessage}`);
    }
  };
  
  const getPlayerAction = (player: Player) => {
    if (!user || user.id === player.id) {
      return null;
    }

    if (liveMatchPlayerIds.has(player.id)) {
      return (
        <button 
          onClick={() => setActiveView('history')}
          className="text-xl"
          title="Перейти к Live-матчу"
        >
          ▶️
        </button>
      );
    }

    if (pendingChallengePlayerIds.has(player.id)) {
      return (
         <button 
          onClick={() => setActiveView('account')}
          className="text-xl"
          title="Перейти к активному вызову"
        >
          ⏳
        </button>
      );
    }

    return (
      <button 
        onClick={() => handleChallenge(player)}
        className="text-xl transition-transform transform hover:scale-125"
        title={`Вызвать ${player.name}`}
      >
        ⚔️
      </button>
    );
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-600 text-sm text-gray-400">
                  <th className="p-2">Игрок</th>
                  <th className="p-2 text-center">W</th>
                  <th className="p-2 text-center">L</th>
                  <th className="p-2 text-center">Заб.</th>
                  <th className="p-2 text-center">Проп.</th>
                  <th className="p-2 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {players.map((player, index) => (
                  <tr key={`${player.id}-${index}`} className="border-b border-gray-700 hover:bg-gray-700 align-middle">
                    <td className="p-2 font-semibold flex items-center">
                      <span className="mr-2 text-gray-400">{index + 1}.</span>
                      {player.name}
                    </td>
                    <td className="p-2 text-center font-mono text-green-400">{player.matchesWon || 0}</td>
                    <td className="p-2 text-center font-mono text-orange-400">{player.matchesLost || 0}</td>
                    <td className="p-2 text-center font-mono text-gray-300">{player.pointsScored || 0}</td>
                    <td className="p-2 text-center font-mono text-gray-500">{player.pointsConceded || 0}</td>
                    <td className="p-2 text-center">
                      {getPlayerAction(player)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
  );
};

export default PlayerProfile;
