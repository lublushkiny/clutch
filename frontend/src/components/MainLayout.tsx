import React from 'react';
import { useAuth } from '../contexts/AuthContext'; // Need to get user balance
import axios from 'axios';
import type { TournamentState } from '../types';

const navItems = [
  { id: 'queue', label: 'Очередь' },
  { id: 'leaderboard', label: 'Лидеры' },
  { id: 'history', label: 'История' },
  { id: 'account', label: 'Аккаунт' },
];

interface MainLayoutProps {
    children: React.ReactNode;
    activeView: string;
    setActiveView: (view: string) => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, activeView, setActiveView }) => {
    const { user } = useAuth();
    const [superGamePool, setSuperGamePool] = React.useState(0);

    React.useEffect(() => {
        const fetchState = async () => {
            try {
                const res = await axios.get<TournamentState>(`${import.meta.env.VITE_API_URL}/state`);
                setSuperGamePool(res.data.superGamePool);
            } catch (error) {
                console.error("Failed to fetch tournament state for layout:", error);
            }
        };
        fetchState();
        const interval = setInterval(fetchState, 5000);
        return () => clearInterval(interval);
    }, []);

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans">
      <div className="max-w-lg mx-auto bg-gray-900 flex flex-col h-screen">
        <header className="p-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
                <span role="img" aria-label="gas-pump">⛽️</span>
                <span className="font-bold text-lg">{user?.clutchPoints.toLocaleString()}</span>
            </div>
            <h1 className="text-3xl font-bold text-orange-500">CLUTCH</h1>
            <div className="flex items-center space-x-2">
                <span role="img" aria-label="trophy">🏆</span>
                <span className="font-bold text-lg">{superGamePool.toLocaleString()}</span>
            </div>
        </header>
        
        <main className="flex-grow p-4 overflow-y-auto">
          {children}
        </main>

        <nav className="flex justify-around bg-gray-800 p-2 sticky bottom-0">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex flex-col items-center p-2 rounded-md transition-colors w-full ${
                  activeView === item.id ? 'bg-orange-600 text-white' : 'text-gray-400 hover:bg-gray-700'
                }`
              }
            >
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default MainLayout;
