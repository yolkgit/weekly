import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface AdInterstitialProps {
    isOpen: boolean;
    onClose: () => void;
    config: Record<string, string>;
}

export const AdInterstitial: React.FC<AdInterstitialProps> = ({ isOpen, onClose, config }) => {
    const [timer, setTimer] = useState(3);
    const [canClose, setCanClose] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTimer(3);
            setCanClose(false);
            const interval = setInterval(() => {
                setTimer((prev) => {
                    if (prev <= 1) {
                        setCanClose(true);
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const adCode = config['COUPANG_INTERSTITIAL_HTML'] || config['ADSENSE_INTERSTITIAL_ID'];

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in no-print">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden relative flex flex-col items-center p-6">

                <h3 className="text-lg font-bold text-slate-800 mb-4">잠시 광고를 보고 가실게요! 🙇‍♂️</h3>

                {/* Ad Container */}
                <div className="w-full h-64 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200 mb-6">
                    <div className="text-center text-slate-400 text-sm">
                        <p>전면 광고 영역</p>
                        <p className="mt-2 text-xs opacity-70">{adCode || '광고 코드가 설정되지 않았습니다'}</p>
                    </div>
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    disabled={!canClose}
                    className={`
                        w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2
                        ${canClose
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-xl cursor-pointer'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
                    `}
                >
                    {canClose ? (
                        <>
                            <span>닫고 계속하기</span>
                            <X size={18} />
                        </>
                    ) : (
                        <span>{timer}초 뒤에 닫을 수 있어요</span>
                    )}
                </button>

                <div className="mt-4 text-xs text-slate-400">
                    * 프리미엄을 구독하면 광고 없이 바로 저장됩니다.
                </div>
            </div>
        </div>
    );
};
