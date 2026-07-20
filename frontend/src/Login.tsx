import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from './contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL + '/auth';

interface LoginProps {
  onToggle: () => void;
}

const Login: React.FC = () => {
  const [telegram, setTelegram] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const auth = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!telegram || !password) {
      setError('Все поля обязательны.');
      return;
    }
    try {
      const response = await axios.post(`${API_URL}/login`, { telegram, password });
      auth.login(response.data.token, response.data.player);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Ошибка входа.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-orange-500 mb-6">Вход для администратора</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium">Telegram</label>
            <input
              type="text"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              className="w-full bg-gray-700 border-gray-600 rounded-md p-3 mt-1 focus:ring-orange-500 focus:border-orange-500"
              placeholder="@username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 border-gray-600 rounded-md p-3 mt-1 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
          {error && <p className="text-red-500 text-center">{error}</p>}
          <button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-md transition-colors"
          >
            Войти
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
