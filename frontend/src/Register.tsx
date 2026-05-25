import React, { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL + '/auth';

interface RegisterProps {
  onToggle: () => void;
}

const Register: React.FC<RegisterProps> = ({ onToggle }) => {
  const [name, setName] = useState('');
  const [telegram, setTelegram] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!name || !telegram || !password) {
      setError('Все поля обязательны.');
      return;
    }
    try {
      await axios.post(`${API_URL}/register`, { name, telegram, password });
      setSuccess('Регистрация успешна! Теперь вы можете войти.');
      setTimeout(() => onToggle(), 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Ошибка регистрации.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-orange-500 mb-6">Регистрация</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium">Имя игрока</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-700 border-gray-600 rounded-md p-3 mt-1 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
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
          {success && <p className="text-green-500 text-center">{success}</p>}
          <button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-md transition-colors"
          >
            Зарегистрироваться
          </button>
        </form>
        <p className="text-center mt-6">
          Уже есть аккаунт?{' '}
          <button onClick={onToggle} className="text-orange-500 hover:underline">
            Войти
          </button>
        </p>
      </div>
    </div>
  );
};

export default Register;
