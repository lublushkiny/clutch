import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import MainLayout from './components/MainLayout';
import Login from './Login';
import Register from './Register';
import QueueView from './components/views/QueueView';
import LeaderboardView from './components/views/LeaderboardView';
import MatchHistoryView from './components/views/MatchHistoryView';
import AccountView from './components/views/AccountView';

// This component contains the main logic after auth is checked
const AppContent = () => {
    const { isAuthenticated } = useAuth();
    const [activeView, setActiveView] = useState('leaderboard');
    const [showRegister, setShowRegister] = useState(false);

    const renderView = () => {
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
    };

    if (!isAuthenticated) {
        return showRegister 
            ? <Register onToggle={() => setShowRegister(false)} /> 
            : <Login onToggle={() => setShowRegister(true)} />;
    }

    return (
        <MainLayout activeView={activeView} setActiveView={setActiveView}>
            {renderView()}
        </MainLayout>
    );
};

export default AppContent;
