import { useState, useEffect } from 'react';
import axios from 'axios';
import type { Player } from '../../types';
import PlayerProfile from '../PlayerProfile';

const API_URL = import.meta.env.VITE_API_URL;

interface LeaderboardViewProps {
  setActiveView: (view: string) => void;
}

const LeaderboardView: React.FC<LeaderboardViewProps> = ({ setActiveView }) => {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const playersRes = await axios.get(`${API_URL}/players`);
        const playersData = playersRes.data as Player[];
        // Sort players by matchesWon (descending). Default to 0 if matchesWon is not available.
        const sortedPlayers = playersData.sort((a, b) => (b.matchesWon || 0) - (a.matchesWon || 0));
        const uniquePlayers = Array.from(new Map(sortedPlayers.map((p: Player) => [p.id, p])).values());
        setPlayers(uniquePlayers as Player[]);
      } catch (error) {
        console.error("Failed to fetch players:", error);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000); // Less frequent updates for leaderboard
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
        <h1 className="text-4xl font-bold text-center mb-8">Лидеры</h1>
        <PlayerProfile players={players} setActiveView={setActiveView} />
    </div>
  );
};

export default LeaderboardView;
