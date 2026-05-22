import React from 'react';
import type { Player } from '../types';

interface PlayerProfileProps {
  players: Player[];
}

const PlayerProfile: React.FC<PlayerProfileProps> = ({ players }) => {
  // Add sorting state here in a future iteration if needed
  
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="p-2">Игрок</th>
                  <th className="p-2 text-right">Заработано</th>
                  <th className="p-2 text-right">Баланс</th>
                  <th className="p-2 text-right">Макс. серия</th></tr>
              </thead>
              <tbody>
                {players.map((player, index) => (
                  <tr key={`${player.id}-${index}`} className="border-b border-gray-700 hover:bg-gray-700">
                    <td className="p-2 font-semibold flex items-center">
                      <span className="mr-2 text-gray-400">{index + 1}.</span>
                      {player.name}
                    </td>
                    <td className="p-2 text-right font-mono text-orange-400">{player.totalEarned.toLocaleString()}</td>
                    <td className="p-2 text-right font-mono">{player.clutchPoints.toLocaleString()}</td>
                    <td className="p-2 text-right font-mono">{player.maxStreak} 🔥</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
  );
};

export default PlayerProfile;
