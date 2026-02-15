import React from 'react';
import { INITIAL_SCHEDULE, DAYS, generateId, getRecommendedSchedule, getTimeRange, getCustomTimeRange, GRADE_DEFAULTS, FULL_TIME_RANGE, DEFAULT_REWARD_CONFIG } from './constants.ts';
import { TimeSlot, FontConfig, RewardMode, PointUsageLog, ChildProfile, GradeLevel, RewardConfig } from './types.ts';
import { ScheduleGrid } from './components/ScheduleGrid.tsx';
import { MobileDayView } from './components/MobileDayView.tsx';
import { StatsCard } from './components/StatsCard.tsx';
import { EditSlotModal } from './components/EditSlotModal.tsx';
import { FontSettingsModal } from './components/FontSettingsModal.tsx';
import { GameTimeModal } from './components/GameTimeModal.tsx';
import { ChildManagementModal } from './components/ChildManagementModal.tsx';
import { HelpModal } from './components/HelpModal.tsx';
import { SecurityKeypad } from './components/SecurityKeypad.tsx';
import { getScheduleAdvice } from './services/geminiService.ts';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { AuthPage } from './pages/AuthPage.tsx';
import { Dashboard } from './Dashboard.tsx';

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