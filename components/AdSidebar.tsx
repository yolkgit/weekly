import React, { useEffect, useState } from 'react';

interface AdSidebarProps {
    side: 'left' | 'right';
    config: Record<string, string>;
    isPremium: boolean;
}

export const AdSidebar: React.FC<AdSidebarProps> = ({ side, config, isPremium }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if ads are globally enabled and user is not premium
        const adsEnabled = config['ADS_ENABLED'] === 'true';
        setIsVisible(adsEnabled && !isPremium);
    }, [config, isPremium]);

    if (!isVisible) return null;

    // Get specific ad code based on side
    // In a real scenario, you might have 'ADSENSE_LEFT_ID' vs 'ADSENSE_RIGHT_ID'
    // For now, we'll just use a generic slot or the raw script from config
    const adCode = config['COUPANG_BANNER_HTML'] || config['ADSENSE_SLOT_ID'];
    const isCoupang = !!config['COUPANG_BANNER_HTML'];

    return (
        <div
            className={`
                fixed top-1/2 -translate-y-1/2 ${side === 'left' ? 'left-4' : 'right-4'}
                hidden xl:flex flex-col items-center justify-center
                w-[160px] h-[600px] bg-slate-100 border border-slate-200 rounded-lg shadow-sm overflow-hidden z-30 no-print
            `}
        >
            <div className="text-[10px] text-slate-400 absolute top-1 uppercase tracking-wider">Advertisement</div>

            {/* Ad Content */}
            <div className="w-full h-full flex items-center justify-center p-2">
                {isCoupang ? (
                    <div dangerouslySetInnerHTML={{ __html: adCode }} />
                ) : (
                    /* AdSense Placeholder / Script execution would go here */
                    <div className="text-center text-slate-400 text-xs">
                        <p>Google AdSense</p>
                        <p className="mt-2 text-[10px]">{adCode || 'No Ad Code Configured'}</p>
                    </div>
                )}
            </div>
        </div>
    );
};
