import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const AccountView: React.FC = () => {
  const { user, logout } = useAuth();

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
      </div>
    </div>
  );
};

export default AccountView;
