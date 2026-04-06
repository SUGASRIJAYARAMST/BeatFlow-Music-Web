import { useRef, useEffect, useState } from "react";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { X, Zap, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AD_DURATION = 10;

const PRO_FEATURES = [
    "Ad-free listening",
    "Play songs in any order",
    "Download songs",
    "High quality audio",
    "Priority support",
    "Offline playback",
    "Exclusive badges",
    "Early access to new features",
];

const AdOverlay = () => {
    const { isPremium, userRole, songsPlayedSinceLastAd, setIsPlaying } = usePlayerStore();
    const navigate = useNavigate();
    const [visible, setVisible] = useState(false);
    const [countdown, setCountdown] = useState(AD_DURATION);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (isPremium || userRole === "admin" || visible) return;
        if (songsPlayedSinceLastAd >= 4) {
            setVisible(true);
            setCountdown(AD_DURATION);
            usePlayerStore.getState().resetAdCounter();
            usePlayerStore.getState().setIsPlaying(false);
            const audio = document.querySelector('audio');
            if (audio) audio.pause();
        }
    }, [isPremium, userRole, songsPlayedSinceLastAd, visible]);

    useEffect(() => {
        if (!visible) return;
        intervalRef.current = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    setVisible(false);
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    setIsPlaying(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [visible, setIsPlaying]);

    if (!visible) return null;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-base-200 rounded-3xl max-w-lg w-full relative border border-base-100/20 shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500/20 to-violet-500/20 p-6 pb-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold">
                            <Zap className="size-3" /> ADVERTISEMENT
                        </div>
                        <p className="text-xs text-base-content/40">{countdown}s remaining</p>
                    </div>
                    <h2 className="text-2xl font-bold text-gradient">Upgrade to BeatFlow Pro</h2>
                    <p className="text-sm text-base-content/60 mt-1">Skip ads forever and unlock everything</p>
                </div>

                <div className="p-6 pt-4">
                    <div className="grid grid-cols-2 gap-2 mb-6">
                        {PRO_FEATURES.map((f) => (
                            <div key={f} className="flex items-center gap-2 text-sm text-base-content/70">
                                <Check className="size-3.5 text-emerald-500 shrink-0" />
                                <span>{f}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3 mb-4">
                        <div className="flex-1 p-4 rounded-xl border border-base-100/30 bg-base-100/50 text-center">
                            <p className="text-xs text-base-content/40">Monthly</p>
                            <p className="text-xl font-bold">₹29</p>
                        </div>
                        <div className="flex-1 p-4 rounded-xl border-2 border-emerald-500/50 bg-emerald-500/5 text-center relative">
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">Best</div>
                            <p className="text-xs text-base-content/40">Yearly</p>
                            <p className="text-xl font-bold text-emerald-400">₹99</p>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            setVisible(false);
                            if (intervalRef.current) clearInterval(intervalRef.current);
                            navigate("/premium");
                        }}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-full transition-colors"
                    >
                        Get Pro Now
                    </button>

                    <div className="w-full bg-base-300 rounded-full h-1 mt-4">
                        <div className="bg-amber-500 h-1 rounded-full transition-all duration-1000" style={{ width: `${((AD_DURATION - countdown) / AD_DURATION) * 100}%` }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdOverlay;
