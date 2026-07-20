import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import type { Challenge } from '../types';

export const ChallengesView: React.FC = () => {
    const [incoming, setIncoming] = useState<Challenge[]>([]);
    const [outgoing, setOutgoing] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchChallenges = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/challenges');
            setIncoming(res.data.incoming || []);
            setOutgoing(res.data.outgoing || []);
        } catch (error) {
            console.error("Failed to fetch challenges:", error);
            alert('Не удалось загрузить список вызовов.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchChallenges();
    }, [fetchChallenges]);

    const handleAccept = async (challengeId: string) => {
        if (!window.confirm('Принять этот вызов?')) return;
        try {
            const res = await axios.post(`/api/challenges/${challengeId}/accept`);
            alert(res.data.message);
            fetchChallenges(); // Refresh the list
        } catch (error: any) {
            alert(error.response?.data?.message || 'Не удалось принять вызов.');
        }
    };

    const handleReject = async (challengeId: string) => {
        if (!window.confirm('Отклонить или отменить этот вызов?')) return;
        try {
            const res = await axios.post(`/api/challenges/${challengeId}/reject`);
            alert(res.data.message);
            fetchChallenges(); // Refresh the list
        } catch (error: any) {
            alert(error.response?.data?.message || 'Не удалось выполнить действие.');
        }
    };

    if (loading) {
        return <p className="text-center text-gray-400">Загрузка вызовов...</p>;
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold mb-4">Входящие вызовы</h2>
                {incoming.length > 0 ? (
                    <ul className="space-y-3">
                        {incoming.map(c => (
                            <li key={c.id} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                                <div>
                                    <p>От: <span className="font-semibold">{c.challengerName}</span></p>
                                    <p className="text-xs text-gray-400">{new Date(c.timestamp).toLocaleString()}</p>
                                </div>
                                <div className="space-x-2">
                                    <button onClick={() => handleAccept(c.id)} className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded-md text-sm">Принять</button>
                                    <button onClick={() => handleReject(c.id)} className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded-md text-sm">Отклонить</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">Нет входящих вызовов.</p>
                )}
            </div>

            <div>
                <h2 className="text-2xl font-bold mb-4">Исходящие вызовы</h2>
                {outgoing.length > 0 ? (
                     <ul className="space-y-3">
                        {outgoing.map(c => (
                            <li key={c.id} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                               <div>
                                    <p>Кому: <span className="font-semibold">{c.opponentName}</span></p>
                                    <p className="text-xs text-gray-400">{new Date(c.timestamp).toLocaleString()}</p>
                                </div>
                                <button onClick={() => handleReject(c.id)} className="bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded-md text-sm">Отменить</button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">Нет исходящих вызовов.</p>
                )}
            </div>
        </div>
    );
};
