import React from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = 'http://localhost:3001/api';

const AccountView: React.FC = () => {
  const { user, logout } = useAuth();

  const handleResetGame = async () => {
    if (window.confirm('Вы уверены, что хотите сбросить игру? Все очки игроков, история матчей и очередь будут очищены.')) {
      try {
        await axios.post(`${API_URL}/admin/reset`);
        alert('Игра успешно сброшена!');
        logout(); // Force logout to clear state and re-authenticate
      } catch (error) {
        console.error('Failed to reset game:', error);
        alert('Не удалось сбросить игру.');
      }
    }
  };

  if (!user) {
    return <div className="text-center p-8">Не авторизован.</div>;
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-4xl font-bold text-center mb-8">Мой аккаунт</h1>
      <div className="bg-gray-800 rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm text-gray-400">Имя</label>
          <p className="text-xl">{user.name}</p>
        </div>
        <div>
          <label className="block text-sm text-gray-400">Telegram</label>
          <p className="text-xl">{user.telegram}</p>
        </div>
        <div>
          <label className="block text-sm text-gray-400">Баланс</label>
          <p className="text-xl font-mono">{user.clutchPoints.toLocaleString()} GAS</p>
        </div>
        <button
          onClick={logout}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-md transition-colors mt-4"
        >
          Выйти
        </button>
        <button
          onClick={handleResetGame}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition-colors mt-4"
        >
          Сбросить игру
        </button>
      </div>
    </div>
  );
};

export default AccountView;
