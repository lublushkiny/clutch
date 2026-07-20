import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import type { Match } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { MatchResolutionForm } from '../MatchResolutionForm';

// Augment Match type for the frontend
interface FrontendMatch extends Match {
    playerAName: string;
    playerBName: string;
}

const MatchHistoryView = () => {
    const { user } = useAuth();
    const [liveMatches, setLiveMatches] = useState<FrontendMatch[]>([]);
    const [completedMatches, setCompletedMatches] = useState<FrontendMatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [resolvingMatchId, setResolvingMatchId] = useState<string | null>(null);

    const fetchMatches = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/matches');
            const allMatches = res.data as FrontendMatch[];
            
            setLiveMatches(allMatches.filter(m => m.status === 'live'));
            setCompletedMatches(allMatches.filter(m => m.status === 'completed'));

        } catch (error) {
            console.error("Failed to fetch matches:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMatches();
    }, [fetchMatches]);

    if (loading) {
        return <div className="text-center p-8">Загрузка матчей...</div>
    }

    const isParticipant = (match: FrontendMatch) => user?.id === match.playerAId || user?.id === match.playerBId;

    return (
        <div className="space-y-10">
            <div>
                <h1 className="text-4xl font-bold text-center mb-6">Live-матчи</h1>
                <div className="space-y-2 max-w-3xl mx-auto">
                    {liveMatches.length === 0 ? (
                        <p className="text-center text-gray-400">Нет активных матчей.</p>
                    ) : (
                        liveMatches.map(match => (
                            <div key={match.id}>
                                <div className="bg-blue-900/50 rounded-t-lg p-4 flex justify-between items-center">
                                    <p className="text-xl">
                                        <span className='font-bold'>{match.playerAName}</span>
                                        <span className="mx-2">vs</span>
                                        <span className='font-bold'>{match.playerBName}</span>
                                    </p>
                                    {(user?.isAdmin || isParticipant(match)) && (
                                        <button 
                                            onClick={() => setResolvingMatchId(resolvingMatchId === match.id ? null : match.id)} 
                                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm"
                                        >
                                            {resolvingMatchId === match.id ? 'Отмена' : 'Завершить'}
                                        </button>
                                    )}
                                </div>
                                {resolvingMatchId === match.id && (
                                    <MatchResolutionForm 
                                        match={match}
                                        mode="resolve"
                                        playerAName={match.playerAName}
                                        playerBName={match.playerBName}
                                        onComplete={() => {
                                            setResolvingMatchId(null);
                                            fetchMatches();
                                        }}
                                        onCancel={() => setResolvingMatchId(null)}
                                    />
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div>
                <h2 className="text-3xl font-bold text-center mb-6">Завершенные</h2>
                <div className="space-y-4 max-w-3xl mx-auto">
                    {completedMatches.length === 0 ? (
                        <p className="text-center text-gray-400">Пока не было сыграно ни одного матча.</p>
                    ) : (
                        completedMatches.map(match => (
                            <div key={match.id} className="bg-gray-800 rounded-lg p-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-sm text-gray-400">{new Date(match.timestamp).toLocaleString()}</p>
                                        <p className="text-xl">
                                            <span className={match.winnerId === match.playerAId ? 'font-bold text-orange-400' : ''}>{match.playerAName}</span>
                                            <span className="mx-2 font-bold">{match.scoreA} - {match.scoreB}</span>
                                            <span className={match.winnerId === match.playerBId ? 'font-bold text-orange-400' : ''}>{match.playerBName}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        {match.videoUrl ? (
                                            <a href={match.videoUrl} target="_blank" rel="noopener noreferrer" title="Смотреть запись">
                                                <svg className="w-8 h-8 text-red-600 hover:text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M10,15L15.19,12L10,9V15M21.56,7.17C21.69,7.64 21.78,8.27 21.84,9.07C21.91,9.87 21.94,10.56 21.94,11.16L22,12C22,14.19 21.84,15.8 21.56,16.83C21.31,17.73 20.73,18.31 19.83,18.56C19.36,18.69 18.73,18.78 17.93,18.84C17.13,18.91 16.44,18.94 15.84,18.94L15,19C12.81,19 11.2,18.84 10.17,18.56C9.27,18.31 8.69,17.73 8.44,16.83C8.31,16.36 8.22,15.73 8.16,14.93C8.09,14.13 8.06,13.44 8.06,12.84L8,12C8,9.81 8.16,8.2 8.44,7.17C8.69,6.27 9.27,5.69 10.17,5.44C11.2,5.16 12.81,5 15,5L15.84,5.06C16.44,5.06 17.13,5.09 17.93,5.16C18.73,5.22 19.36,5.31 19.83,5.44C20.73,5.69 21.31,6.27 21.56,7.17Z" /></svg>
                                            </a>
                                        ) : (
                                            <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><path d="M10,15L15.19,12L10,9V15M21.56,7.17C21.69,7.64 21.78,8.27 21.84,9.07C21.91,9.87 21.94,10.56 21.94,11.16L22,12C22,14.19 21.84,15.8 21.56,16.83C21.31,17.73 20.73,18.31 19.83,18.56C19.36,18.69 18.73,18.78 17.93,18.84C17.13,18.91 16.44,18.94 15.84,18.94L15,19C12.81,19 11.2,18.84 10.17,18.56C9.27,18.31 8.69,17.73 8.44,16.83C8.31,16.36 8.22,15.73 8.16,14.93C8.09,14.13 8.06,13.44 8.06,12.84L8,12C8,9.81 8.16,8.2 8.44,7.17C8.69,6.27 9.27,5.69 10.17,5.44C11.2,5.16 12.81,5 15,5L15.84,5.06C16.44,5.06 17.13,5.09 17.93,5.16C18.73,5.22 19.36,5.31 19.83,5.44C20.73,5.69 21.31,6.27 21.56,7.17Z" /></svg>
                                        )}
                                        {user?.isAdmin && (
                                            <button 
                                                onClick={() => setResolvingMatchId(resolvingMatchId === match.id ? null : match.id)}
                                                className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded-md text-sm"
                                            >
                                                {resolvingMatchId === match.id ? 'Отмена' : 'Изменить'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {resolvingMatchId === match.id && (
                                    <MatchResolutionForm 
                                        match={match}
                                        mode="edit"
                                        playerAName={match.playerAName}
                                        playerBName={match.playerBName}
                                        onComplete={() => {
                                            setResolvingMatchId(null);
                                            fetchMatches();
                                        }}
                                        onCancel={() => setResolvingMatchId(null)}
                                    />
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default MatchHistoryView;
