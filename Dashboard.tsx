import React, { useState, useEffect, useRef } from 'react';


import { INITIAL_SCHEDULE, DAYS, generateId, getRecommendedSchedule, getTimeRange, getCustomTimeRange, GRADE_DEFAULTS, FULL_TIME_RANGE, DEFAULT_REWARD_CONFIG } from './constants';
import { TimeSlot, FontConfig, RewardMode, PointUsageLog, ChildProfile, GradeLevel, RewardConfig } from './types';
import { ScheduleGrid } from './components/ScheduleGrid';
import { MobileDayView } from './components/MobileDayView';
import { StatsCard } from './components/StatsCard';
import { EditSlotModal } from './components/EditSlotModal';

import { FontSettingsModal } from './components/FontSettingsModal';
import { GameTimeModal } from './components/GameTimeModal';
import { ChildManagementModal } from './components/ChildManagementModal';
import { HelpModal } from './components/HelpModal';
import { SecurityKeypad } from './components/SecurityKeypad';
import { getScheduleAdvice } from './services/geminiService';
import { Trophy, Clock, BrainCircuit, UserCog, User, Gamepad2, AlertCircle, AlertTriangle, Lock, Unlock, Printer, PenLine, Settings, Coins, Plus, Users, Smile, LayoutTemplate, Trash2, Baby, School, GraduationCap, Eraser, Sparkles, ChevronDown, BookOpen } from 'lucide-react';

import { api } from './services/api';
import { useAuth } from '@/context/AuthContext';
import { LogOut } from 'lucide-react';

// Colors for children profiles
const CHILD_COLORS = ['indigo', 'emerald', 'rose', 'amber', 'cyan', 'purple'];

export const Dashboard: React.FC = () => {
    const { user, login, logout } = useAuth();
    // --- 1. Child Profile Management ---

    // Initialize Children List
    const [children, setChildren] = useState<ChildProfile[]>([]);
    const [activeChildId, setActiveChildId] = useState<string>("");
    const [loading, setLoading] = useState(true);

    // Load Initial Data
    useEffect(() => {
        const init = async () => {
            try {
                let fetchedChildren = await api.getChildren();
                if (fetchedChildren.length === 0) {
                    // Create default child if none exist
                    const defaultChild = {
                        name: '아이',
                        color: 'indigo',
                        grade: 'elementary' as GradeLevel,
                        startTime: GRADE_DEFAULTS['elementary'].start,
                        endTime: GRADE_DEFAULTS['elementary'].end
                    };
                    const created = await api.createChild(defaultChild);
                    fetchedChildren = [created];
                }
                console.log("Fetched children:", fetchedChildren);
                setChildren(fetchedChildren);

                // Restore active child selection or default to first
                // Use user-specific key
                const userKey = `weekly_paper_active_child_${user?.id}`;
                const savedActiveId = localStorage.getItem(userKey);

                if (savedActiveId && fetchedChildren.find(c => c.id === savedActiveId)) {
                    setActiveChildId(savedActiveId);
                } else if (fetchedChildren.length > 0) {
                    setActiveChildId(fetchedChildren[0].id);
                }
            } catch (e) {
                console.error("Failed to initialize:", e);
                alert("데이터 로딩 실패. 새로고침 해주세요.");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const activeChild = children.find(c => c.id === activeChildId) || children[0] || {} as ChildProfile;

    // Helper to get namespaced storage keys
    const getKey = (key: string) => `${key}_${activeChildId}`;

    // --- 2. Child-Specific State ---

    // Schedule
    const [schedule, setSchedule] = useState<TimeSlot[]>(INITIAL_SCHEDULE);
    const [savedSchedules, setSavedSchedules] = useState<{ id: string, name: string, date: string, schedule: TimeSlot[] }[]>([]);

    // Points & Logs
    const [earnedPoints, setEarnedPoints] = useState(0);
    const [usageLogs, setUsageLogs] = useState<PointUsageLog[]>([]);

    // Configs
    const [rewardMode, setRewardMode] = useState<RewardMode>('time');
    const [currencyUnit, setCurrencyUnit] = useState('포인트');
    const [rewardConfig, setRewardConfig] = useState<RewardConfig>(DEFAULT_REWARD_CONFIG);
    const isPlanConfirmed = !!activeChild?.isPlanConfirmed;

    // Global UI State
    const [isParentMode, setIsParentMode] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [aiAdvice, setAiAdvice] = useState<string | null>(null);
    const [loadingAi, setLoadingAi] = useState(false);
    const [isPdfGenerating, setIsPdfGenerating] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Font Config (Global)
    const [fontConfig, setFontConfig] = useState<FontConfig>({
        family: "'Noto Sans KR', sans-serif",
        label: "기본 (고딕)",
        sizeLevel: 0
    });

    // Modals
    const [isFontModalOpen, setIsFontModalOpen] = useState(false);
    const [isGameTimeModalOpen, setIsGameTimeModalOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isChildManageModalOpen, setIsChildManageModalOpen] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
    const [securityAction, setSecurityAction] = useState<'auth' | 'setup'>('auth');
    const [tempPassword, setTempPassword] = useState("");
    const [editingSlot, setEditingSlot] = useState<TimeSlot | undefined>(undefined);
    const [selectedDayIdx, setSelectedDayIdx] = useState(0);
    const [selectedTime, setSelectedTime] = useState("");

    // Batch Selection State
    const [selectedRange, setSelectedRange] = useState<{ start: { day: number, time: string }, end: { day: number, time: string } } | null>(null);
    const [isClearing, setIsClearing] = useState(false);



    // Dynamic Time Range - Use custom times from child profile
    const visibleTimeRange = getCustomTimeRange(
        activeChild.startTime || GRADE_DEFAULTS.elementary.start,
        activeChild.endTime || GRADE_DEFAULTS.elementary.end
    );

    // --- Effects ---

    // Resize listener
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Persist Active Child ID (User Specific)
    useEffect(() => {
        if (user?.id && activeChildId) {
            localStorage.setItem(`weekly_paper_active_child_${user.id}`, activeChildId);
        }
    }, [activeChildId, user]);

    // Load Data When Active Child Changes
    useEffect(() => {
        if (!activeChildId) return;

        const loadChildData = async () => {
            setLoading(true);
            try {
                // Parallel fetch
                const [sched, logs, rConfig] = await Promise.all([
                    api.getSchedule(activeChildId),
                    api.getLogs(activeChildId),
                    api.getRewardConfig(activeChildId)
                ]);

                setSchedule(sched);
                setUsageLogs(logs);
                setRewardConfig(rConfig);

                // Reset transient UI states
                setSelectedRange(null);
                setIsClearing(false);
            } catch (e) {
                console.error("Failed to load child data:", e);
            } finally {
                setLoading(false);
            }
        };
        loadChildData();
    }, [activeChildId]);

    // Load Saved Schedules
    useEffect(() => {
        if (!activeChildId) return;
        const loadSnapshots = async () => {
            try {
                const snaps = await api.getSnapshots(activeChildId);
                setSavedSchedules(snaps);
            } catch (e) {
                console.error("Failed to load snapshots:", e);
            }
        };
        loadSnapshots();
    }, [activeChildId]);

    // Persist Data: Removed automatic localStorage effects. 
    // API calls are handling persistence in handlers now.

    // Recalculate EARNED points based on current Reward Config
    useEffect(() => {
        let newEarned = 0;
        schedule.forEach(slot => {
            if (slot.status === 'completed') {
                const points = rewardConfig[slot.type] || 0;
                newEarned += points;
            } else if (slot.status === 'failed') {
                const points = rewardConfig[slot.type] || 0;
                newEarned -= points;
            }
        });
        setEarnedPoints(newEarned);
    }, [schedule, rewardConfig]);


    // --- Handlers ---

    // --- Handlers (CRUD for Children) ---

    // Create
    const handleAddChild = async (child: ChildProfile) => {
        try {
            const created = await api.createChild(child);
            setChildren(prev => [...prev, created]);
        } catch (e) {
            console.error("Failed to create child:", e);
            alert("아이 추가 실패");
        }
    };

    // Update (General)
    const handleUpdateActiveChild = async (updatedChild: ChildProfile) => {
        // Optimistic update
        setChildren(prev => prev.map(c => c.id === updatedChild.id ? updatedChild : c));

        try {
            await api.updateChild(updatedChild.id, updatedChild);
        } catch (e) {
            console.error("Failed to update child:", e);
            alert("저장 실패. 다시 시도해주세요.");
            // Revert? For now just alert.
        }
    };

    const handleSecurityConfirm = async (password: string) => {
        if (securityAction === 'auth') {
            const correctPass = user?.parentPassword || "0000";
            if (password === correctPass) {
                setIsParentMode(true);
                setIsSecurityModalOpen(false);
            } else {
                alert("비밀번호가 틀렸습니다.");
            }
        } else if (securityAction === 'setup') {
            try {
                await api.updateParentPassword(password);
                alert("비밀번호가 변경되었습니다.");
                setIsSecurityModalOpen(false);
                // Refresh user data (if possible) or just update local session
                if (user) {
                    const newUser = { ...user, parentPassword: password };
                    login(localStorage.getItem('token') || "", newUser);
                }
            } catch (e) {
                console.error("Failed to update password:", e);
                alert("비밀번호 변경 실패");
            }
        }
    };

    // Delete
    const handleDeleteChild = async (childId: string) => {
        try {
            await api.deleteChild(childId); // Assume api.deleteChild exists, if not need to add it
            const newChildren = children.filter(c => c.id !== childId);
            setChildren(newChildren);
            if (activeChildId === childId && newChildren.length > 0) {
                setActiveChildId(newChildren[0].id);
            }
        } catch (e) {
            console.error("Failed to delete child:", e);
            alert("삭제 실패");
        }
    };

    const handleTimeRangeChange = (type: 'start' | 'end', value: string) => {
        const updatedChild = {
            ...activeChild,
            [type === 'start' ? 'startTime' : 'endTime']: value
        };
        handleUpdateActiveChild(updatedChild);
    };

    const handleUsePoints = async (amount: number) => {
        try {
            const newLog = await api.addLog(activeChildId, amount, '사용');
            setUsageLogs(prev => [newLog, ...prev]);
        } catch (e) {
            console.error("Failed to use points:", e);
            alert("포인트 사용 처리에 실패했습니다.");
        }
    };

    const handleResetUsedPoints = async () => {
        try {
            await api.resetLogs(activeChildId);
            setUsageLogs([]);
            alert("사용 내역이 초기화되었습니다.");
        } catch (e) {
            console.error("Failed to reset logs:", e);
            alert("사용 내역 초기화에 실패했습니다.");
        }
    };

    const handleLoadTemplate = (type: GradeLevel) => {
        // Immediate update without confirmation as requested
        const newSchedule = getRecommendedSchedule(type);
        setSchedule(newSchedule);

        // Update the child's grade AND default times to match the template
        const def = GRADE_DEFAULTS[type];

        handleUpdateActiveChild({
            ...activeChild,
            grade: type,
            startTime: def.start,
            endTime: def.end,
            isPlanConfirmed: false
        });
    };

    const handleClearSchedule = async () => {
        if (isClearing) {
            setSchedule([]);
            setIsClearing(false);
            try {
                await api.clearSchedule(activeChildId);
            } catch (e) {
                console.error("Failed to clear schedule:", e);
            }
        } else {
            setIsClearing(true);
            setTimeout(() => setIsClearing(false), 3000);
        }
    };

    const formatReward = (points: number, short = false) => {
        if (rewardMode === 'time') {
            const h = Math.floor(Math.max(0, points) / 60);
            const m = Math.max(0, points) % 60;
            if (short) return `${h}h ${m}m`;
            return `${h}시간 ${m}분`;
        } else {
            return `${points} ${currencyUnit}`;
        }
    };

    // Handle Range Selection from Grid
    const handleRangeSelect = (start: { day: number, time: string }, end: { day: number, time: string }) => {
        setSelectedRange({ start, end });
        setEditingSlot(undefined); // Clear specific slot editing
        setSelectedDayIdx(start.day); // Default to start day for reference
        setSelectedTime(start.time); // Default to start time
        setIsModalOpen(true);
    };

    const handleSlotClick = async (dayIndex: number, time: string, slot?: TimeSlot) => {
        if (!isPlanConfirmed) {
            setSelectedRange(null); // Clear range
            setSelectedDayIdx(dayIndex);
            setSelectedTime(time);
            setEditingSlot(slot);
            setIsModalOpen(true);
            return;
        }
        if (isPlanConfirmed && isParentMode && slot) {
            const nextSchedule = schedule.map(s => {
                if (s.id !== slot.id) return s;
                let newStatus: TimeSlot['status'] = 'completed';
                if (s.status === 'completed') newStatus = 'failed';
                else if (s.status === 'failed') newStatus = 'pending';
                return { ...s, status: newStatus };
            });

            setSchedule(nextSchedule);
            try {
                await api.saveScheduleBatch(activeChildId, nextSchedule);
            } catch (e) {
                console.error("Failed to update status:", e);
            }
            return;
        }
    };

    const handleSaveSlot = async (data: Partial<TimeSlot>) => {
        let nextSchedule: TimeSlot[] = [];

        if (selectedRange) {
            // Batch Save
            const minDay = Math.min(selectedRange.start.day, selectedRange.end.day);
            const maxDay = Math.max(selectedRange.start.day, selectedRange.end.day);

            const timeRangeList = visibleTimeRange;
            const startTIdx = timeRangeList.indexOf(selectedRange.start.time);
            const endTIdx = timeRangeList.indexOf(selectedRange.end.time);
            const minTIdx = Math.min(startTIdx, endTIdx);
            const maxTIdx = Math.max(startTIdx, endTIdx);

            nextSchedule = [...schedule];

            // Loop through selected range
            for (let d = minDay; d <= maxDay; d++) {
                for (let t = minTIdx; t <= maxTIdx; t++) {
                    const timeStr = timeRangeList[t];
                    // Check if slot exists
                    const existingIdx = nextSchedule.findIndex(s => s.dayIndex === d && s.startTime === timeStr);

                    if (existingIdx >= 0) {
                        // Update existing
                        nextSchedule[existingIdx] = {
                            ...nextSchedule[existingIdx],
                            activity: data.activity || nextSchedule[existingIdx].activity,
                            type: data.type || nextSchedule[existingIdx].type,
                            status: 'pending' // Reset status on edit
                        };
                    } else {
                        // Create new
                        nextSchedule.push({
                            id: generateId(),
                            dayIndex: d,
                            startTime: timeStr,
                            durationMinutes: 30,
                            activity: data.activity || '새로운 활동',
                            type: data.type || 'rest',
                            status: 'pending'
                        });
                    }
                }
            }
            setSelectedRange(null);
        } else if (editingSlot) {
            nextSchedule = schedule.map(s => s.id === editingSlot.id ? { ...s, ...data } : s);
        } else {
            const newSlot: TimeSlot = {
                id: generateId(),
                dayIndex: selectedDayIdx,
                startTime: selectedTime,
                durationMinutes: 30,
                activity: data.activity || '새로운 활동',
                type: data.type || 'rest',
                status: 'pending',
            };
            nextSchedule = [...schedule, newSlot];
        }

        setSchedule(nextSchedule);
        try {
            await api.saveScheduleBatch(activeChildId, nextSchedule);
        } catch (e) {
            console.error("Failed to save schedule:", e);
            alert("일정 저장에 실패했습니다.");
        }
    };

    const handleDeleteSlot = async (id: string) => {
        let nextSchedule: TimeSlot[] = [];
        if (selectedRange) {
            // Batch Delete
            const minDay = Math.min(selectedRange.start.day, selectedRange.end.day);
            const maxDay = Math.max(selectedRange.start.day, selectedRange.end.day);
            const timeRangeList = visibleTimeRange;
            const startTIdx = timeRangeList.indexOf(selectedRange.start.time);
            const endTIdx = timeRangeList.indexOf(selectedRange.end.time);
            const minTIdx = Math.min(startTIdx, endTIdx);
            const maxTIdx = Math.max(startTIdx, endTIdx);

            // Filter out all slots in range
            nextSchedule = schedule.filter(s => {
                const sTIdx = timeRangeList.indexOf(s.startTime);
                const inDayRange = s.dayIndex >= minDay && s.dayIndex <= maxDay;
                const inTimeRange = sTIdx >= minTIdx && sTIdx <= maxTIdx;
                return !(inDayRange && inTimeRange);
            });
        } else {
            nextSchedule = schedule.filter(s => s.id !== id);
        }

        setSchedule(nextSchedule);
        try {
            await api.saveScheduleBatch(activeChildId, nextSchedule);
        } catch (e) {
            console.error("Failed to delete slot:", e);
            alert("일정 삭제에 실패했습니다.");
        }
    };

    const handleAiAnalysis = async () => {
        setLoadingAi(true);
        const advice = await getScheduleAdvice(schedule);
        setAiAdvice(advice);
        setLoadingAi(false);
    };



    const handleSaveSnapshot = async () => {
        // Auto-save logic was here? No this is manual?
        // Ah, the user previous conversation said "manual save button removed".
        // But `App.tsx` still has `handleSaveSnapshot` which is used by confirm button logic?
        // Let's check where it's called.
        // It is called by `handleSaveSnapshot` but actually the confirm button logic has INLINED the save logic in `App.tsx` (lines 635+).
        // I need to update the confirm button logic too!
        // But this function `handleSaveSnapshot` might still be around.
        // Let's keep it but update implementation just in case.
        const name = prompt("저장할 계획표의 이름을 입력하세요:", `${new Date().toLocaleDateString()} 계획`);
        if (!name) return;

        try {
            const newSnapshot = await api.createSnapshot({
                childId: activeChildId,
                name,
                date: new Date().toLocaleDateString(),
                schedule
            });
            setSavedSchedules(prev => [newSnapshot, ...prev]);
        } catch (e) {
            alert("저장 실패");
        }
    };

    const handleLoadSnapshot = (snapshot: { schedule: TimeSlot[] }) => {
        if (confirm("이 계획표를 불러오시겠습니까? 현재 작성 중인 내용은 사라집니다.")) {
            setSchedule(snapshot.schedule);
            // Also update backend to match loaded state
            api.saveScheduleBatch(activeChildId, snapshot.schedule).catch(e => console.error("Failed to sync loaded schedule:", e));
        }
    };

    const handleDeleteSnapshot = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("정말 삭제하시겠습니까?")) {
            try {
                await api.deleteSnapshot(id);
                setSavedSchedules(prev => prev.filter(s => s.id !== id));
            } catch (e) {
                alert("삭제 실패");
            }
        }
    };

    const handlePrintClick = () => {
        // Simple window.print() relies on @media print CSS
        // We can add a small delay if needed for re-renders but usually direct call is fine
        window.print();
    };



    // Calculate current balance
    const usedPoints = usageLogs.reduce((acc, log) => acc + log.amount, 0);
    const currentBalance = earnedPoints - usedPoints;
    const completedTasks = schedule.filter(s => s.status === 'completed').length;

    // Render Helpers
    const getColorClass = (color: string) => {
        switch (color) {
            case 'indigo': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            case 'emerald': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'rose': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'amber': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'cyan': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
            case 'purple': return 'bg-purple-100 text-purple-700 border-purple-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 print:bg-white" style={{ fontFamily: fontConfig.family }}>

            {/* Navbar */}
            <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 no-print">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    {/* Left: Logo & Child Switcher */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
                                <Trophy size={20} />
                            </div>
                            <h1 className="font-bold text-xl tracking-tight text-indigo-900 hidden sm:block" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>Weekly Paper</h1>
                        </div>

                        {/* Separator */}
                        <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

                        {/* Child Switcher */}
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar p-2">
                            {children.map(child => (
                                <button
                                    key={child.id}
                                    onClick={() => setActiveChildId(child.id)}
                                    className={`
                                flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold border transition-all whitespace-nowrap
                                ${activeChildId === child.id
                                            ? `ring-2 ring-offset-1 ring-${child.color}-400 ${getColorClass(child.color)}`
                                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}
                            `}
                                >
                                    {activeChildId === child.id ? <Smile size={16} /> : <User size={16} />}
                                    {child.name}
                                </button>
                            ))}

                            {isParentMode && (
                                <button
                                    onClick={() => setIsChildManageModalOpen(true)}
                                    className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition-colors shrink-0"
                                    title="아이 관리 (추가/수정/삭제)"
                                >
                                    <Settings size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right: Controls */}
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button
                            type="button"
                            onClick={handlePrintClick}
                            className="p-2 text-slate-500 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors cursor-pointer group"
                            title="계획표 출력"
                        >
                            <Printer size={20} className="group-hover:text-indigo-600" />
                        </button>

                        <button
                            onClick={() => setIsGameTimeModalOpen(true)}
                            className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full border border-indigo-100 transition-colors cursor-pointer group"
                        >
                            {rewardMode === 'time' ? <Gamepad2 size={18} className="text-indigo-600 group-hover:scale-110 transition-transform" /> : <Coins size={18} className="text-indigo-600 group-hover:scale-110 transition-transform" />}
                            <span className="text-sm font-semibold text-indigo-700 hidden sm:inline">
                                {formatReward(currentBalance)} 남음
                            </span>
                            <span className="text-sm font-semibold text-indigo-700 sm:hidden">
                                {formatReward(currentBalance, true)}
                            </span>
                        </button>

                        <button
                            onClick={() => {
                                if (isParentMode) {
                                    setIsParentMode(false);
                                } else {
                                    setSecurityAction('auth');
                                    setIsSecurityModalOpen(true);
                                }
                            }}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isParentMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            {isParentMode ? <UserCog size={16} /> : <User size={16} />}
                            <span className="hidden sm:inline">{isParentMode ? '부모님 모드' : '아이 모드'}</span>
                        </button>
                        <button
                            onClick={logout}
                            className="p-2 text-slate-500 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors cursor-pointer group"
                            title="로그아웃"
                        >
                            <LogOut size={20} className="group-hover:text-red-600" />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Capture Root: Contains elements to be printed */}
            <div id="capture-root">
                {/* Print Header (Visible ONLY during capture/print via 'print-only' logic) */}
                <div className="print-only text-center mb-4 pt-4 px-4">
                    <h1 className="text-2xl font-black text-slate-900 mb-1">Weekly Paper: {activeChild.name}의 주간 계획표</h1>
                    <p className="text-slate-500 text-sm">규칙적인 생활로 자유시간을 모아보세요!</p>
                </div>

                <main className="max-w-6xl mx-auto p-4 space-y-6 print:space-y-0 print:p-0 bg-slate-50 print:bg-white">

                    {/* Dashboard Header (Hidden during capture via 'no-print' class) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print md:h-[200px]">
                        {/* Main Status */}
                        <div
                            onClick={() => setIsGameTimeModalOpen(true)}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-rows md:flex-col justify-between items-center md:items-stretch gap-4 md:gap-0 cursor-pointer hover:border-indigo-300 transition-all group h-full"
                        >
                            <div className="flex-1">
                                <h2 className="text-slate-500 font-semibold text-xs uppercase tracking-wider mb-1 flex items-center justify-between">
                                    {rewardMode === 'time' ? '사용 가능 점수 (시간)' : '사용 가능 포인트'}
                                    <Settings size={14} className="opacity-0 group-hover:opacity-100 text-slate-400" />
                                </h2>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-3xl font-black ${currentBalance >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>{currentBalance}</span>
                                    <span className="text-slate-400 font-medium text-sm">{rewardMode === 'time' ? '분' : currencyUnit}</span>
                                </div>
                            </div>
                            <div className="flex-1 md:mt-2 md:pt-2 md:border-t md:border-slate-100 w-full">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-slate-600">완료한 일정</span>
                                    <span className="font-bold text-slate-800">{completedTasks}개</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-green-400 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (completedTasks / 20) * 100)}%` }}></div>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">일정을 지키면 보상이 늘어나요!</p>
                            </div>
                        </div>

                        {/* Visual Stats */}
                        <div className="md:col-span-1">
                            <StatsCard schedule={schedule} />
                        </div>

                        {/* AI Coach / Control Center */}
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-4 rounded-2xl shadow-sm text-white flex flex-col relative overflow-hidden z-30 h-full">
                            <div className="relative z-10 w-full h-full flex flex-col">
                                <div className="flex items-center gap-2 mb-2 opacity-90">
                                    <BrainCircuit size={16} />
                                    <span className="font-bold text-xs">AI 스케줄 코치 & 설정</span>
                                </div>

                                {/* Parent Controls */}
                                {isParentMode ? (
                                    <div className="space-y-2 mt-1 relative">
                                        {/* Confirm/Edit Toggle */}
                                        <button
                                            onClick={() => {
                                                if (isPlanConfirmed) {
                                                    if (confirm("계획 수정을 위해 확정을 취소하시겠습니까?")) {
                                                        handleUpdateActiveChild({ ...activeChild, isPlanConfirmed: false });
                                                    }
                                                } else {
                                                    // Auto-save on confirm
                                                    const now = new Date();
                                                    const dateStr = now.toLocaleDateString();
                                                    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

                                                    const name = `${dateStr} 계획 - ${timeStr}`;

                                                    api.createSnapshot({
                                                        childId: activeChildId,
                                                        name,
                                                        date: dateStr,
                                                        schedule
                                                    }).then(snap => {
                                                        setSavedSchedules(prev => [snap, ...prev]);
                                                    }).catch(e => console.error("Auto-save failed", e));

                                                    handleUpdateActiveChild({ ...activeChild, isPlanConfirmed: true });
                                                }
                                            }}
                                            className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg ${isPlanConfirmed ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-300' : 'bg-green-400 text-green-900 hover:bg-green-300'}`}
                                        >
                                            {isPlanConfirmed ? (
                                                <><Unlock size={14} /> 계획 수정 (잠금해제)</>
                                            ) : (
                                                <><Lock size={14} /> 계획 확정 (수정완료)</>
                                            )}
                                        </button>

                                        <div className="flex gap-2 relative">
                                            <button
                                                onClick={handleAiAnalysis}
                                                disabled={loadingAi}
                                                className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/40 text-white px-2 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                            >
                                                {loadingAi ? '분석 중...' : 'AI 분석'}
                                            </button>

                                            <button
                                                onClick={() => {
                                                    setSecurityAction('setup');
                                                    setIsSecurityModalOpen(true);
                                                }}
                                                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/40 text-white px-2 py-1.5 rounded-lg transition-all flex items-center justify-center gap-2"
                                                title="비밀번호 변경"
                                            >
                                                <Settings size={14} />
                                                <span className="text-[10px]">비번</span>
                                            </button>

                                            <button
                                                onClick={() => setIsFontModalOpen(true)}
                                                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/40 text-white px-2 py-1.5 rounded-lg transition-all flex items-center justify-center"
                                                title="글자 설정"
                                            >
                                                <Settings size={14} />
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => setIsHelpModalOpen(true)}
                                            className="w-full mt-1 bg-indigo-800/50 hover:bg-indigo-800/70 border border-indigo-400/50 text-indigo-100 px-2 py-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <BookOpen size={12} /> 📖 사용 설명서
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-indigo-100 text-xs leading-relaxed mb-2">
                                            {isPlanConfirmed
                                                ? "이번 주 계획이 확정되었어요! 👍"
                                                : "부모님과 상의하여 계획을 세워보세요."}
                                        </p>
                                        <div className="bg-black/20 rounded-lg p-1.5 text-[10px] text-indigo-100 text-center">
                                            {isPlanConfirmed ? "평가 중 (수정 불가)" : "계획 작성 중"}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-4 pt-4 border-t border-white/20 flex flex-col flex-1 min-h-0 overflow-hidden">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-indigo-100 flex items-center gap-1">
                                            <Clock size={12} /> 저장된 계획표
                                        </span>
                                    </div>

                                    <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar max-h-60 md:max-h-none">
                                        {savedSchedules.length === 0 ? (
                                            <div className="text-[10px] text-indigo-200 text-center py-4">
                                                확정된 계획표가 없습니다.
                                            </div>
                                        ) : (
                                            savedSchedules.map(snapshot => (
                                                <div
                                                    key={snapshot.id}
                                                    onClick={() => handleLoadSnapshot(snapshot)}
                                                    className="bg-black/20 hover:bg-black/30 p-1.5 rounded-lg cursor-pointer transition-colors group relative"
                                                >
                                                    <div className="flex justify-between items-center w-full">
                                                        <div className="flex-1 min-w-0 mr-2">
                                                            <div className="text-[10px] font-bold text-white truncate text-left">{snapshot.name}</div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => handleDeleteSnapshot(snapshot.id, e)}
                                                            className="text-indigo-300 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                                        >
                                                            <Trash2 size={10} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                            </div>
                            {/* Added pointer-events-none to prevent blocking clicks */}
                            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                        </div>
                    </div>

                    {/* AI Advice Result Area (Hidden during capture) */}
                    {aiAdvice && isParentMode && (
                        <div className="bg-white border border-indigo-100 p-6 rounded-2xl shadow-sm animate-fade-in relative no-print">
                            <button onClick={() => setAiAdvice(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><AlertCircle size={18} /></button>
                            <h3 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                                <BrainCircuit size={20} className="text-indigo-500" />
                                AI 분석 리포트 ({activeChild.name})
                            </h3>
                            <div className="prose prose-sm text-slate-600 whitespace-pre-line leading-relaxed">
                                {aiAdvice}
                            </div>
                        </div>
                    )}

                    {/* Main Schedule Area */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-1 md:p-6 print:border-none print:shadow-none print:p-0">
                        <div className="flex flex-col gap-4 no-print px-4 py-2 mb-2">
                            <div className="flex items-center justify-between">
                                <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                    <Clock size={20} className="text-slate-400" />
                                    주간 계획표 - {activeChild.name}
                                </h2>

                                {/* Status Badges */}
                                <div className="flex gap-2">
                                    {!isPlanConfirmed && (
                                        <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-3 py-1 rounded-full flex items-center gap-1 animate-pulse">
                                            <PenLine size={12} /> 계획 작성 중
                                        </span>
                                    )}
                                    {isPlanConfirmed && (
                                        <span className="text-xs text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full flex items-center gap-1">
                                            <Lock size={12} /> 계획 확정됨
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Quick Template Toolbar (Only visible when planning) */}
                            {!isPlanConfirmed && (
                                /* Increased z-index to 30 to stay above other elements if overlapped */
                                <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 relative z-30">

                                    {/* Time Range Selectors */}
                                    <div className="flex items-center gap-1 mr-2 bg-white px-2 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                        <Clock size={14} className="text-indigo-500" />
                                        <div className="flex items-center gap-1">
                                            <select
                                                value={activeChild.startTime || "07:00"}
                                                onChange={(e) => handleTimeRangeChange('start', e.target.value)}
                                                className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer appearance-none hover:text-indigo-600 text-center"
                                                style={{ textAlignLast: 'center' }}
                                            >
                                                {FULL_TIME_RANGE.slice(0, 30).map(t => (
                                                    <option key={t} value={t}>{t}</option>
                                                ))}
                                            </select>
                                            <span className="text-slate-400 text-xs font-light">~</span>
                                            <select
                                                value={activeChild.endTime || "22:00"}
                                                onChange={(e) => handleTimeRangeChange('end', e.target.value)}
                                                className="text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer appearance-none hover:text-indigo-600 text-center"
                                                style={{ textAlignLast: 'center' }}
                                            >
                                                {FULL_TIME_RANGE.map(t => (
                                                    <option key={t} value={t}>{t}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="w-px h-4 bg-slate-200 mx-1 hidden sm:block"></div>

                                    <div className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1 hidden sm:flex">
                                        <Sparkles size={14} className="text-yellow-400" />
                                        <span>추천:</span>
                                    </div>

                                    <button
                                        onClick={() => handleLoadTemplate('elementary')}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-yellow-400 hover:bg-yellow-50 text-slate-600 hover:text-yellow-700 rounded-lg text-xs font-bold transition-all shadow-sm"
                                    >
                                        <Baby size={14} className="text-yellow-500" /> <span className="hidden sm:inline">초등</span>
                                    </button>
                                    <button
                                        onClick={() => handleLoadTemplate('middle')}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-purple-400 hover:bg-purple-50 text-slate-600 hover:text-purple-700 rounded-lg text-xs font-bold transition-all shadow-sm"
                                    >
                                        <School size={14} className="text-purple-500" /> <span className="hidden sm:inline">중등</span>
                                    </button>
                                    <button
                                        onClick={() => handleLoadTemplate('high')}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded-lg text-xs font-bold transition-all shadow-sm"
                                    >
                                        <GraduationCap size={14} className="text-slate-500" /> <span className="hidden sm:inline">고등</span>
                                    </button>

                                    <div className="w-px h-4 bg-slate-200 mx-2 hidden sm:block"></div>

                                    <button
                                        type="button"
                                        onClick={handleClearSchedule}
                                        className={`
                                    flex items-center gap-1 px-3 py-1.5 border rounded-lg text-xs font-bold transition-all shadow-sm ml-auto sm:ml-0 group relative z-20 cursor-pointer whitespace-nowrap
                                    ${isClearing
                                                ? 'bg-red-500 text-white border-red-600 hover:bg-red-600 animate-pulse'
                                                : 'bg-white border-slate-200 hover:border-red-400 hover:bg-red-50 text-slate-500 hover:text-red-600'}
                                `}
                                        title="모든 일정 삭제"
                                    >
                                        {isClearing ? (
                                            <><AlertTriangle size={14} /> 정말 초기화할까요?</>
                                        ) : (
                                            <><Eraser size={14} className="group-hover:text-red-500" /> 초기화</>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Hint Message */}
                        {!isPlanConfirmed && (
                            <div className="px-4 pb-2 text-xs text-slate-400 no-print flex items-center gap-2">
                                <span>* 빈 칸을 클릭하거나,</span>
                                <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 font-bold">
                                    드래그하여 여러 칸을 한 번에 선택
                                </span>
                                <span>할 수 있습니다.</span>
                            </div>
                        )}
                        {isPlanConfirmed && isParentMode && (
                            <div className="px-4 pb-2 text-xs text-rose-500 font-medium no-print">
                                * 부모님 모드: 일정을 클릭하여 성공(O)/실패(X)를 체크해주세요.
                            </div>
                        )}

                        {/* Desktop Grid (Visible in Print/Desktop) */}
                        <div className="hidden md:block print:block">
                            <ScheduleGrid
                                schedule={schedule}
                                onSlotClick={handleSlotClick}
                                onRangeSelect={handleRangeSelect}
                                isParentMode={isParentMode}
                                isPlanConfirmed={isPlanConfirmed}
                                fontConfig={fontConfig}
                                timeRange={visibleTimeRange}
                            />
                        </div>

                        {/* Mobile View (Hidden in Print) 
                    NOTE: For HTML2Canvas capture, we force desktop width so 'md:block' becomes visible and this becomes hidden.
                */}
                        <div className="md:hidden print:hidden">
                            <MobileDayView
                                schedule={schedule}
                                onSlotClick={handleSlotClick}
                                isParentMode={isParentMode}
                            />
                        </div>
                    </div>

                </main>
            </div>

            {/* Edit Slot Modal */}
            <EditSlotModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveSlot}
                onDelete={handleDeleteSlot}
                initialData={editingSlot}
                dayName={selectedRange ? `${DAYS[selectedRange.start.day].name} 등` : DAYS[selectedDayIdx].name}
                timeStr={selectedRange ? `${selectedRange.start.time} ~ ${selectedRange.end.time}` : selectedTime}
                selectionCount={selectedRange ?
                    (Math.abs(selectedRange.end.day - selectedRange.start.day) + 1) *
                    (Math.abs(visibleTimeRange.indexOf(selectedRange.end.time) - visibleTimeRange.indexOf(selectedRange.start.time)) + 1)
                    : undefined}
            />

            {/* Font Settings Modal */}
            <FontSettingsModal
                isOpen={isFontModalOpen}
                onClose={() => setIsFontModalOpen(false)}
                config={fontConfig}
                onUpdate={setFontConfig}
                activeChild={activeChild}
                onUpdateChild={handleUpdateActiveChild}
            />

            {/* Game Time Modal */}
            <GameTimeModal
                isOpen={isGameTimeModalOpen}
                onClose={() => setIsGameTimeModalOpen(false)}
                earnedPoints={earnedPoints}
                usedPoints={usedPoints}
                onUsePoints={handleUsePoints}
                onResetUsed={handleResetUsedPoints}
                rewardMode={rewardMode}
                onRewardModeChange={setRewardMode}
                currencyUnit={currencyUnit}
                onCurrencyUnitChange={setCurrencyUnit}
                rewardConfig={rewardConfig}
                onRewardConfigChange={setRewardConfig}
                usageLogs={usageLogs}
                isParentMode={isParentMode}
            />

            {/* Child Management Modal */}
            <ChildManagementModal
                isOpen={isChildManageModalOpen}
                onClose={() => setIsChildManageModalOpen(false)}
                childrenList={children}
                onAddChild={handleAddChild}
                onEditChild={handleUpdateActiveChild}
                onDeleteChild={handleDeleteChild}
                activeChildId={activeChildId}
                setActiveChildId={setActiveChildId}
            />

            {/* Help Modal */}
            <HelpModal
                isOpen={isHelpModalOpen}
                onClose={() => setIsHelpModalOpen(false)}
            />



            <SecurityKeypad
                isOpen={isSecurityModalOpen}
                onClose={() => setIsSecurityModalOpen(false)}
                onConfirm={handleSecurityConfirm}
                title={securityAction === 'auth' ? "부모님 모드 확인" : "비밀번호 설정"}
                description={securityAction === 'auth' ? "비밀번호를 입력해주세요." : "새로운 비밀번호를 입력해주세요 (4-8자리)."}
            />
        </div>
    );
};

// Export is named 'Dashboard' at the top