import React from 'react';
import type { Player } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface TournamentBracketProps {
  king: Player | undefined;
  queue: { playerId: string; bid: number; name: string }[];
  canStartMatch: boolean;
  handleStartMatch: () => void;
}

const TournamentBracket: React.FC<TournamentBracketProps> = ({ king, queue, canStartMatch, handleStartMatch }) => {
  const { user } = useAuth();
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
      {/* --- THE KING --- */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-2 text-center text-gray-400">Топ-1</h3>
        {king ? (
          <div className="bg-orange-500 text-white p-4 rounded-lg flex justify-between items-center shadow-md">
            <div>
              <p className="text-2xl font-bold">{king.name}</p>
              <p className="text-md opacity-80">{king.telegram ? `@${king.telegram.startsWith('@') ? king.telegram.substring(1) : king.telegram}` : ''}</p>
            </div>
            <div className="text-right">
              <p className="text-lg">Побед подряд</p>
              <p className="text-3xl font-bold">{king.currentStreak}</p>
            </div>
          </div>
        ) : (
          <div className="bg-gray-700 p-4 rounded-lg text-center">
            <p className="text-lg">Место свободно.</p>
          </div>
        )}
      </div>

      {/* --- THE QUEUE --- */}
      <div>
        <h3 className="text-lg font-semibold mb-2 text-center text-gray-400">Очередь</h3>
        {queue.length > 0 ? (
          <div className="space-y-4">
            {queue.map((item, index) => (
              <div key={`${item.playerId}-${index}`} className={`p-4 rounded-lg flex justify-between items-center transition-all duration-300 ${index === 0 ? 'bg-gray-700' : 'bg-gray-800'}`}>
                <div className="flex items-center">
                  <span className={`text-2xl font-bold mr-4 ${index === 0 ? 'text-white' : 'text-gray-400'}`}>#{index + 1}</span>
                  <div>
                    <p className="text-xl font-semibold">{item.name}</p>
                    <p className="text-md font-mono text-orange-300">Ставка: {item.bid.toLocaleString()} GAS</p>
                  </div>
                </div>
                {index === 0 && canStartMatch && user?.isAdmin ? (
                    <button
                        onClick={handleStartMatch}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md text-lg transition-colors"
                    >
                        Начать!
                    </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-700 p-6 rounded-lg text-center">
            <p className="text-xl">В очереди нет претендентов. Сделайте ставку, чтобы ворваться!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentBracket;
