import React from 'react';

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
  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans">
      <div className="max-w-lg mx-auto bg-gray-900 flex flex-col h-screen">
        <header className="text-center p-4">
            <h1 className="text-3xl font-bold text-orange-500">CLUTCH</h1>
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
