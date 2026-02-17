import React, { useState, useEffect } from 'react';
import { Save, Shield, Settings, AlertTriangle, Monitor, XCircle, CheckCircle } from 'lucide-react';
import { api } from './services/api';

export const AdminDashboard: React.FC = () => {
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Config States
    const [adsEnabled, setAdsEnabled] = useState(false);
    const [adsenseId, setAdsenseId] = useState('');
    const [coupangHtml, setCoupangHtml] = useState('');
    const [kakaoQrCode, setKakaoQrCode] = useState(''); // Base64
    const [isLoading, setIsLoading] = useState(false);

    // Pending Deposits
    const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);

    const loadPendingDeposits = async () => {
        try {
            const res = await fetch('/api/admin/pending-deposits');
            const data = await res.json();
            if (Array.isArray(data)) setPendingDeposits(data);
        } catch (e) {
            console.error(e);
        }
    };

    const loadConfig = async () => {
        try {
            const config = await api.getPublicConfig();
            setAdsEnabled(config['ADS_ENABLED'] === 'true');
            setAdsenseId(config['ADSENSE_SLOT_ID'] || '');
            setCoupangHtml(config['COUPANG_BANNER_HTML'] || '');
            setKakaoQrCode(config['KAKAO_PAY_QR'] || '');
        } catch (e) {
            console.error("Failed to load config", e);
        }
    };

    useEffect(() => {
        // Load public config initially to see current state
        loadConfig();
        if (isAuthenticated) loadPendingDeposits();
    }, [isAuthenticated]);

    const approveDeposit = async (userId: string) => {
        if (!confirm("입금을 확인하고 승인하시겠습니까?")) return;
        try {
            const res = await fetch('/api/admin/approve-deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, password })
            });
            if (res.ok) {
                alert("승인되었습니다.");
                loadPendingDeposits();
            } else {
                alert("실패했습니다.");
            }
        } catch (e) {
            alert("오류가 발생했습니다.");
        }
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'admin1234') {
            setIsAuthenticated(true);
        } else {
            alert("비밀번호가 틀렸습니다.");
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await api.updateAdminConfig(password, {
                ADS_ENABLED: String(adsEnabled),
                ADSENSE_SLOT_ID: adsenseId,
                COUPANG_BANNER_HTML: coupangHtml,
                KAKAO_PAY_QR: kakaoQrCode
            });
            alert("설정이 저장되었습니다.");
        } catch (e) {
            alert("설정 저장 실패 (비밀번호 확인)");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
                    <div className="flex justify-center mb-6">
                        <div className="bg-indigo-100 p-3 rounded-full">
                            <Shield size={32} className="text-indigo-600" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">관리자 접속</h2>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="관리자 비밀번호"
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                            접속하기
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
            {/* Header */}
            <header className="bg-indigo-900 text-white px-6 py-4 shadow-lg sticky top-0 z-50">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Settings size={24} className="text-indigo-300" />
                        <h1 className="text-xl font-bold">Admin Dashboard</h1>
                    </div>
                    <button onClick={() => setIsAuthenticated(false)} className="text-sm bg-indigo-800 px-3 py-1 rounded hover:bg-indigo-700">로그아웃</button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-6 space-y-6">

                {/* Deposit Requests */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex items-center gap-2">
                        <Monitor size={20} className="text-indigo-600" />
                        <h2 className="font-bold text-indigo-900">입금 확인 요청 ({pendingDeposits.length})</h2>
                    </div>
                    <div className="p-0">
                        {pendingDeposits.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">대기 중인 요청이 없습니다.</div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {pendingDeposits.map(user => (
                                    <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div>
                                            <div className="font-bold text-slate-800">{user.name} <span className="text-slate-400 font-normal text-xs">({user.email})</span></div>
                                            <div className="text-sm text-indigo-600 font-bold mt-0.5">입금자명: {user.depositorName || '(미입력)'}</div>
                                            <div className="text-xs text-slate-500">{new Date(user.createdAt).toLocaleDateString()} 가입</div>
                                        </div>
                                        <button
                                            onClick={() => approveDeposit(user.id)}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"
                                        >
                                            승인하기
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold mb-1">앱 광고 상태</h2>
                        <p className={`text-sm font-medium flex items-center gap-1 ${adsEnabled ? 'text-green-600' : 'text-slate-400'}`}>
                            {adsEnabled ? <CheckCircle size={16} /> : <XCircle size={16} />}
                            {adsEnabled ? "현재 광고가 노출되고 있습니다." : "현재 광고가 꺼져 있습니다."}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-600">광고 ON/OFF</span>
                        <div
                            onClick={() => setAdsEnabled(!adsEnabled)}
                            className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-colors ${adsEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                        >
                            <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform ${adsEnabled ? 'translate-x-6' : ''}`} />
                        </div>
                    </div>
                </div>

                {/* Ad Settings */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
                        <Monitor size={20} className="text-slate-500" />
                        <h2 className="font-bold text-slate-700">광고 배너 설정</h2>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* AdSense */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Google AdSense Slot ID</label>
                            <input
                                type="text"
                                value={adsenseId}
                                onChange={e => setAdsenseId(e.target.value)}
                                placeholder="예: 1234567890"
                                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                            />
                            <p className="text-xs text-slate-400 mt-1">사이드바 및 전면 슬롯 ID (Client ID는 코드에 직접 삽입 권장)</p>
                        </div>

                        {/* Coupang */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Coupang Partners HTML</label>
                            <textarea
                                value={coupangHtml}
                                onChange={e => setCoupangHtml(e.target.value)}
                                placeholder="<iframe>...</iframe>"
                                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm h-32 resize-none"
                            />
                            <p className="text-xs text-slate-400 mt-1">쿠팡 파트너스에서 생성한 iframe 코드를 붙여넣으세요.</p>
                        </div>
                        {/* KakaoPay QR */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">카카오페이 QR 송금 코드</label>

                            <div className="flex items-start gap-4">
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    setKakaoQrCode(reader.result as string);
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">카카오페이 송금 받기 QR코드 이미지를 업로드하세요. (이미지는 자동으로 변환되어 저장됩니다)</p>
                                </div>
                                {kakaoQrCode && (
                                    <div className="w-24 h-24 border border-slate-200 rounded-lg overflow-hidden bg-white shrink-0">
                                        <img src={kakaoQrCode} alt="Kakao QR" className="w-full h-full object-contain" />
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            {isLoading ? "저장 중..." : <><Save size={18} /> 설정 저장하기</>}
                        </button>
                    </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle size={20} className="text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                        <strong>주의사항:</strong><br />
                        쿠팡 파트너스 활동은 공정위 심사 지침에 따라 "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다." 문구를 반드시 표기해야 합니다. 배너 내에 포함되어 있는지 확인하세요.
                    </div>
                </div>

            </main>
        </div>
    );
};
