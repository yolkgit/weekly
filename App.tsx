import React from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './Dashboard';

const MainContent: React.FC = () => {
    const { isAuthenticated, user } = useAuth();

    if (!isAuthenticated) {
        return <AuthPage />;
    }

    return <Dashboard />;
};

const App: React.FC = () => {
    return (
        <AuthProvider>
            <MainContent />
        </AuthProvider>
    );
};

export default App;