import { useState, useEffect, useMemo } from 'react';
import { useAuth } from './contexts/AuthContext';
import MainLayout from './components/MainLayout';
import Login from './Login';
import LeaderboardView from './components/views/LeaderboardView';
import MatchHistoryView from './components/views/MatchHistoryView';
import AccountView from './components/views/AccountView';
import axios from 'axios';

const AppContent = () => {
    const { isAuthenticated, login } = useAuth();
    const [activeView, setActiveView] = useState('leaderboard');
    const [authMode, setAuthMode] = useState<'pending' | 'telegram' | 'manual'>('pending');

    useEffect(() => {
        const handleTelegramAuth = () => {
            const tg = window.Telegram.WebApp;
            tg.ready();
            
            axios.post('/api/auth/telegram', { initData: tg.initData })
                .then(response => {
                    const { token, player } = response.data;
                    login(token, player);
                })
                .catch(err => {
                    console.error("Telegram authentication failed:", err);
                    // Optionally show an error to the user before closing
                    tg.close();
                });
        };

        const hash = window.location.hash;
        // Check for Telegram-specific data in the URL hash
        if (hash.includes('tgWebAppData')) {
            setAuthMode('telegram');
            
            // Check if script is already loaded
            if (window.Telegram) {
                handleTelegramAuth();
            } else {
                // Dynamically inject the script
                const script = document.createElement('script');
                script.src = 'https://telegram.org/js/telegram-web-app.js';
                script.async = true;
                script.onload = handleTelegramAuth; // Authenticate after script loads
                script.onerror = () => {
                    console.error("Failed to load Telegram script.");
                    // Fallback or show error if script fails to load
                    setAuthMode('manual'); 
                };
                document.body.appendChild(script);
            }
        } else {
            // Not in a Telegram environment
            setAuthMode('manual');
        }
    }, [login]);

    const currentView = useMemo(() => {
        switch (activeView) {
            case 'leaderboard':
                return <LeaderboardView setActiveView={setActiveView} />;
            case 'history':
                return <MatchHistoryView />;
            case 'account':
                return <AccountView />;
            default:
                return <LeaderboardView setActiveView={setActiveView} />;
        }
    }, [activeView]);

    if (isAuthenticated) {
        return (
            <MainLayout activeView={activeView} setActiveView={setActiveView}>
                {currentView}
            </MainLayout>
        );
    }

    if (authMode === 'manual') {
        return <Login />;
    }

    return (
        <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center">
            <p>Подключение...</p>
        </div>
    );
};

export default AppContent;
