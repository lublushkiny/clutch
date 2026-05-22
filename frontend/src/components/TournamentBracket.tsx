import React from 'react';
import type { Player } from '../types';
import axios from 'axios';

interface TournamentBracketProps {
  king: Player | undefined;
  queue: { playerId: string; bid: number; name: string }[];
}

const API_URL = 'http://localhost:3001/api';

const TournamentBracket: React.FC<TournamentBracketProps> = ({ king, queue }) => {
    
  const handleResolveMatch = async (winnerId: string) => {
    if (!king || queue.length === 0) return;
    const challenger = queue[0];
    const playerA = king.id;
    const playerB = challenger.playerId;
    const confirmed = window.confirm(`Завершить матч между ${king.name} и ${challenger.name}? Победитель: ${winnerId === playerA ? king.name : challenger.name}`);
    if(confirmed){
        try {
            await axios.post(`${API_URL}/matches/resolve`, { winnerId });
        } catch (error) {
            console.error('Не удалось завершить матч:', error);
            alert('Не удалось завершить матч');
        }
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
      {/* --- THE KING --- */}
      <div className="mb-8">
        <h3 className="text-2xl font-semibold mb-4 text-center">Царь горы</h3>
        {king ? (
          <div className="bg-orange-500 text-white p-6 rounded-lg flex justify-between items-center shadow-2xl">
            <div>
              <p className="text-3xl font-bold">{king.name}</p>
              {console.log('King Telegram:', king.telegram)}
              <p className="text-lg opacity-80">{king.telegram ? `@${king.telegram}` : ''}</p>
            </div>
            <div className="text-right">
              <p className="text-xl">Побед подряд</p>
              <p className="text-5xl font-bold">{king.currentStreak} 🔥</p>
            </div>
          </div>
        ) : (
          <div className="bg-gray-700 p-6 rounded-lg text-center">
            <p className="text-xl">Трон пуст. Первый претендент станет царем.</p>
          </div>
        )}
      </div>

      {/* --- THE QUEUE --- */}
      <div>
        <h3 className="text-2xl font-semibold mb-4 text-center">Очередь претендентов</h3>
        {queue.length > 0 ? (
          <div className="space-y-4">
            {queue.map((item, index) => (
              <div key={`${item.playerId}-${index}`} className={`p-4 rounded-lg flex justify-between items-center transition-all duration-300 ${index === 0 ? 'bg-orange-600 shadow-lg scale-105' : 'bg-gray-700'}`}>
                <div className="flex items-center">
                  <span className={`text-2xl font-bold mr-4 ${index === 0 ? 'text-white' : 'text-gray-400'}`}>#{index + 1}</span>
                  <div>
                    <p className="text-xl font-semibold">{item.name}</p>
                    <p className="text-md font-mono text-orange-300">Ставка: {item.bid.toLocaleString()} GAS</p>
                  </div>
                </div>
                {index === 0 && king && (
                   <div className="flex gap-2">
                       <button onClick={() => handleResolveMatch(king.id)} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">Победа царя</button>
                       <button onClick={() => handleResolveMatch(item.playerId)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded">Победа претендента</button>
                   </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-700 p-6 rounded-lg text-center">
            <p className="text-xl">В очереди нет претендентов. Сделайте ставку, чтобы сразиться с царем!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentBracket;
