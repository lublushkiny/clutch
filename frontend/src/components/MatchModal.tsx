import React, { useState } from 'react';
import type { Player } from '../types';

interface MatchModalProps {
    player1: Player;
    player2: Player;
    matchType: 'king_vs_challenger' | 'challenger_vs_challenger';
    onClose: () => void;
    onMatchEnd: (winnerId: string) => Promise<void>;
}

const MatchModal: React.FC<MatchModalProps> = ({ player1, player2, matchType, onClose, onMatchEnd }) => {
    const [player1Score, setPlayer1Score] = useState(0);
    const [player2Score, setPlayer2Score] = useState(0);
    const [isResolving, setIsResolving] = useState(false);

    const handleEndMatch = async () => {
        setIsResolving(true);
        let winnerId: string;
        if (player1Score > player2Score) {
            winnerId = player1.id;
        } else if (player2Score > player1Score) {
            winnerId = player2.id;
        } else {
            alert("Матч не может закончиться ничьей. Отрегулируйте счет.");
            setIsResolving(false);
            return;
        }

        try {
            await onMatchEnd(winnerId);
        } catch (error) {
            // Error handling is already in onMatchEnd
        } finally {
            setIsResolving(false);
        }
    };

    const getPlayerRole = (player: Player) => {
        if (matchType === 'king_vs_challenger') {
            return player.id === player1.id ? '(Король)' : '(Претендент)';
        } else { // challenger_vs_challenger
            return player.id === player1.id ? '(Претендент 1)' : '(Претендент 2)';
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-400 hover:text-white text-2xl font-bold"
                >
                    &times;
                </button>
                <h2 className="text-3xl font-bold text-center text-orange-400 mb-6">Текущий матч</h2>

                <div className="flex justify-around text-center mb-8">
                    {/* Player 1 */}
                    <div>
                        <p className="text-xl font-semibold">{player1.name}</p>
                        <p className="text-sm text-gray-400 mb-2">{getPlayerRole(player1)}</p>
                        <div className="flex items-center justify-center space-x-2 mt-2">
                            <button
                                onClick={() => setPlayer1Score(prev => Math.max(0, prev - 1))}
                                className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-full w-8 h-8 flex items-center justify-center"
                            >-
                            </button>
                            <span className="text-5xl font-bold text-orange-300">{player1Score}</span>
                            <button
                                onClick={() => setPlayer1Score(prev => prev + 1)}
                                className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-full w-8 h-8 flex items-center justify-center"
                            >+
                            </button>
                        </div>
                    </div>
                    <div className="text-4xl font-bold self-center">VS</div>
                    {/* Player 2 */}
                    <div>
                        <p className="text-xl font-semibold">{player2.name}</p>
                        <p className="text-sm text-gray-400 mb-2">{getPlayerRole(player2)}</p>
                        <div className="flex items-center justify-center space-x-2 mt-2">
                            <button
                                onClick={() => setPlayer2Score(prev => Math.max(0, prev - 1))}
                                className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-full w-8 h-8 flex items-center justify-center"
                            >-
                            </button>
                            <span className="text-5xl font-bold text-orange-300">{player2Score}</span>
                            <button
                                onClick={() => setPlayer2Score(prev => prev + 1)}
                                className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-full w-8 h-8 flex items-center justify-center"
                            >+
                            </button>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleEndMatch}
                    disabled={isResolving}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:opacity-50"
                >
                    {isResolving ? 'Завершение...' : 'Завершить матч'}
                </button>
            </div>
        </div>
    );
};

export default MatchModal;
