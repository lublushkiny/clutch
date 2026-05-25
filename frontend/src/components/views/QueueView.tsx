import { useState, useEffect } from 'react';
import axios from 'axios';
import type { Player, TournamentState } from '../../types';
import TournamentBracket from '../TournamentBracket';
import AuctionPanel from '../AuctionPanel';
import MatchModal from '../MatchModal'; // Import the new MatchModal component
import { useAuth } from '../../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL;

const QueueView = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [tournamentState, setTournamentState] = useState<TournamentState | null>(null);
  const [isMatchActive, setIsMatchActive] = useState(false); // New state for match modal
  const [activeMatchData, setActiveMatchData] = useState<{ king: Player; challenger: Player } | null>(null); // Data for the active match
  const { user } = useAuth();

  const fetchData = async () => {
    try {
      const [playersRes, stateRes] = await Promise.all([
        axios.get(`${API_URL}/players`),
        axios.get(`${API_URL}/state`)
      ]);
      console.log("[DEBUG] fetchData received players:", playersRes.data);
      setPlayers(playersRes.data);
      setTournamentState(stateRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  };

  useEffect(() => {
    console.log("[DEBUG] players state updated:", players);
  }, [players]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const king = players.find(p => p.id === tournamentState?.currentKingId);
  const firstChallenger = tournamentState?.queue[0] ? players.find(p => p.id === tournamentState.queue[0].playerId) : undefined;
  const secondChallenger = tournamentState?.queue[1] ? players.find(p => p.id === tournamentState.queue[1].playerId) : undefined;

  let canStartMatch = false;
  let matchType: 'king_vs_challenger' | 'challenger_vs_challenger' | null = null;

  if (king && firstChallenger) {
    canStartMatch = true;
    matchType = 'king_vs_challenger';
  } else if (!king && firstChallenger && secondChallenger) {
    canStartMatch = true;
    matchType = 'challenger_vs_challenger';
  }

  const handleStartMatch = () => {
    if (matchType === 'king_vs_challenger' && king && firstChallenger) {
      setActiveMatchData({ king: king, challenger: firstChallenger, matchType: 'king_vs_challenger' });
      setIsMatchActive(true);
    } else if (matchType === 'challenger_vs_challenger' && firstChallenger && secondChallenger) {
      setActiveMatchData({ king: firstChallenger, challenger: secondChallenger, matchType: 'challenger_vs_challenger' }); // Here 'king' and 'challenger' are just player1 and player2
      setIsMatchActive(true);
    }
  };

  const handleMatchEnd = async (winnerId: string) => {
    try {
        const res = await axios.post(`${API_URL}/matches/resolve`, { winnerId });
        console.log("[DEBUG] Match resolved, response:", res.data);
        
        // Обновляем данные победителя в контексте, если это текущий пользователь
        if (res.data.winner && user && String(res.data.winner.id) === String(user.id)) {
             updateUser(res.data.winner);
        }
        
        setIsMatchActive(false);
        setActiveMatchData(null);
        
        // Добавляем небольшую задержку для гарантии завершения транзакции на бэкенде
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await fetchData(); 
    } catch (error) {
        console.error("Failed to resolve match:", error);
        alert("Не удалось завершить матч.");
    }
  }

  if (!tournamentState || !players) {
    return <div className="flex items-center justify-center h-full">Загрузка...</div>;
  }
  
  const queueWithPlayerNames = tournamentState.queue.map(q => {
      const player = players.find(p => p.id === q.playerId);
      return {...q, name: player?.name || 'Unknown'};
  });

  return (
    <div className="space-y-8">

        <TournamentBracket 
            king={king} 
            queue={queueWithPlayerNames} 
            canStartMatch={canStartMatch} 
            handleStartMatch={handleStartMatch} 
        />
        <AuctionPanel onBid={fetchData} king={king} queue={queueWithPlayerNames} />

        {isMatchActive && activeMatchData && matchType && (
            <MatchModal
                player1={activeMatchData.king} // Renamed from king to player1 for flexibility
                player2={activeMatchData.challenger} // Renamed from challenger to player2
                matchType={matchType}
                onClose={() => setIsMatchActive(false)}
                onMatchEnd={handleMatchEnd}
            />
        )}
    </div>
  );
}

export default QueueView;
