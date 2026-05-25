import { useState, useEffect } from 'react';
import axios from 'axios';
import type { Match } from '../../types';

const API_URL = import.meta.env.VITE_API_URL;

// Augment Match type for the frontend
interface FrontendMatch extends Match {
    playerAName: string;
    playerBName: string;
}

const MatchHistoryView = () => {
    const [matches, setMatches] = useState<FrontendMatch[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMatches = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`${API_URL}/matches`);
                setMatches(res.data);
            } catch (error) {
                console.error("Failed to fetch matches:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchMatches();
    }, []);

    if (loading) {
        return <div className="text-center p-8">Загрузка истории матчей...</div>
    }

    return (
        <div>
            <h1 className="text-4xl font-bold text-center mb-8">История матчей</h1>
            <div className="space-y-4 max-w-3xl mx-auto">
                {matches.length === 0 ? (
                    <p className="text-center text-gray-400">Пока не было сыграно ни одного матча.</p>
                ) : (
                    matches.map(match => (
                        <div key={match.id} className="bg-gray-800 rounded-lg p-4 flex justify-between items-center">
                            <div>
                                <p className="text-sm text-gray-400">{new Date(match.timestamp).toLocaleString()}</p>
                                <p className="text-xl">
                                    <span className={match.winnerId === match.playerAId ? 'font-bold text-orange-400' : ''}>{match.playerAName}</span>
                                    <span className="text-gray-500"> vs </span>
                                    <span className={match.winnerId === match.playerBId ? 'font-bold text-orange-400' : ''}>{match.playerBName}</span>
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-mono text-lg">
                                    {match.playerABid ? `${match.playerABid} vs ` : ''}
                                    {match.playerBBid ? match.playerBBid : ''}
                                    <span className="text-sm text-gray-400"> GAS</span>
                                </p>
                                {match.jackpotWon ? (
                                    <p className="text-xs text-green-400 font-bold">Супер-пул! (+{match.jackpotWon})</p>
                                ) : (
                                    <p className="text-xs text-gray-500">(в супер-пул: {match.superGameContribution})</p>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MatchHistoryView;
