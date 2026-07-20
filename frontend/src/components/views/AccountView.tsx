import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { ChallengesView } from '../ChallengesView';

const AccountView: React.FC = () => {
  const { user, logout } = useAuth();

  const handleResetLeague = async () => {
    const isConfirmed = window.confirm(
      'Вы уверены, что хотите перезапустить лигу? Это действие необратимо и сбросит всю статистику, историю матчей и очки.'
    );

    if (isConfirmed) {
      try {
        const response = await axios.post('/api/admin/reset');
        alert(response.data.message || 'Лига успешно перезапущена!');
        window.location.reload(); // Перезагружаем страницу, чтобы отразить изменения
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || 'Произошла ошибка при перезапуске лиги.';
        alert(`Ошибка: ${errorMessage}`);
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
        <button
          onClick={logout}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-md transition-colors mt-4"
        >
          Выйти
        </button>
      </div>

      <div className="mt-8">
        <ChallengesView />
      </div>

      {user.isAdmin && (
        <div className="mt-8 bg-red-900/50 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-center mb-4 text-red-300">Админ-панель</h2>
            <p className="text-center text-gray-400 mb-4">Это действие необратимо. Будьте осторожны.</p>
            <button
                onClick={handleResetLeague}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-md transition-colors"
            >
                Рестарт лиги
            </button>
        </div>
      )}
    </div>
  );
};

export default AccountView;
