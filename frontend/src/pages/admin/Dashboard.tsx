import { useEffect, useState, useRef, type ReactNode } from "react";
import { useMusicStore } from "../../stores/useMusicStore";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { Music, Disc, Users, CreditCard, TrendingUp, DollarSign, KeyRound, Check, X, Loader2, Tag, Megaphone, ToggleLeft, ToggleRight, Play, Pause } from "lucide-react";
import { axiosInstance } from "../../lib/axios";
import toast from "react-hot-toast";
import { formatDuration, optimizeImage } from "../../lib/utils";

const useCountUp = (end: number, duration: number = 1500) => {
    const [count, setCount] = useState(0);
    const startTimeRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const animate = (timestamp: number) => {
            if (!startTimeRef.current) startTimeRef.current = timestamp;
            const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(end * easeOut));
            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate);
            }
        };
        rafRef.current = requestAnimationFrame(animate);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [end, duration]);

    return count;
};

const StatCard = ({ label, value, icon: Icon, color, bg, delay, isHighlighted }: { label: string; value: number | string; icon: React.ComponentType<{className?: string}>; color: string; bg: string; delay: number; isHighlighted: boolean }) => {
    const [visible, setVisible] = useState(false);
    const numValue = typeof value === 'string' ? parseInt(value.replace(/[^0-9]/g, '')) || 0 : value;
    const count = useCountUp(numValue);
    const displayValue = typeof value === 'string' ? (value.includes('₹') ? `₹${count}` : count) : count;

    useEffect(() => {
        const timer = setTimeout(() => setVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    const scaleValue = isHighlighted ? 'scale(1.06)' : 'scale(1)';
    return (
        <div 
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? `translateY(0) ${scaleValue}` : 'translateY(30px) scale(0.95)',
                transition: `all 0.6s cubic-bezier(0.4, 0, 0.2, 1)`,
                transitionDelay: `${delay}ms`,
                borderColor: isHighlighted ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)',
                boxShadow: isHighlighted ? '0 0 15px rgba(16,185,129,0.3), 0 0 30px rgba(16,185,129,0.15)' : '0 10px 15px -3px rgb(0 0 0 / 0.1)',
            }}
            className="card bg-base-100 shadow-xl rounded-lg p-6 border-2 border-white/10"
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-base-content/60">{label}</span>
                <div className={`p-2 rounded-lg ${bg}`}>
                    <Icon className={`size-5 ${color}`} />
                </div>
            </div>
            <p className="text-3xl font-bold">{displayValue}</p>
        </div>
    );
};

const AdminDashboard = () => {
    const { stats, fetchStats } = useMusicStore();
    const { recentSongs, refreshRecentSongs, currentSong, isPlaying, togglePlay, playAlbum } = usePlayerStore();
    const [highlightIndex, setHighlightIndex] = useState(0);
    const [pinRequests, setPinRequests] = useState<Array<{ _id: string; fullName: string; email: string; createdAt: string }>>([]);
    const [passwordRequests, setPasswordRequests] = useState<Array<{ _id: string; fullName: string; email: string; createdAt: string }>>([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [offer, setOffer] = useState<{ discount: number; planId: string; active: boolean } | null>(null);
    const [announcements, setAnnouncements] = useState<Array<{ _id: string; title: string; isActive: boolean }>>([]);
    const [loadingOffer, setLoadingOffer] = useState(false);
    useEffect(() => { fetchStats(); refreshRecentSongs(); }, [fetchStats, refreshRecentSongs]);
    useEffect(() => { fetchPinRequests(); fetchPasswordRequests(); fetchOfferData(); }, []);
    
    const fetchOfferData = async () => {
        try {
            const [offerRes, annRes] = await Promise.all([
                axiosInstance.get("/admin/offer"),
                axiosInstance.get("/admin/announcements")
            ]);
            setOffer(offerRes.data);
            setAnnouncements(annRes.data.filter((a: { isActive: boolean }) => a.isActive));
        } catch {}
    };
    
    const fetchPinRequests = async () => {
        try {
            setLoadingRequests(true);
            const res = await axiosInstance.get("/admin/pin-requests");
            setPinRequests(res.data);
        } catch {}
        finally { setLoadingRequests(false); }
    };
    
    const fetchPasswordRequests = async () => {
        try {
            setLoadingRequests(true);
            const res = await axiosInstance.get("/admin/password-requests");
            setPasswordRequests(res.data);
        } catch {}
        finally { setLoadingRequests(false); }
    };

    const handleApprovePin = async (id: string) => {
        try {
            setProcessingId(id);
            await axiosInstance.post(`/admin/pin-requests/${id}/approve`);
            toast.success("PIN reset approved - user can now use their new PIN");
            fetchPinRequests();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to approve");
        } finally { setProcessingId(null); }
    };

    const handleRejectPin = async (id: string) => {
        try {
            setProcessingId(id);
            await axiosInstance.post(`/admin/pin-requests/${id}/reject`);
            toast.success("PIN reset request rejected");
            fetchPinRequests();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to reject");
        } finally { setProcessingId(null); }
    };

    const toggleOffer = async () => {
        if (!offer) return;
        try {
            setLoadingOffer(true);
            await axiosInstance.post("/admin/offer", { 
                discount: offer.discount, 
                planId: offer.planId, 
                active: !offer.active 
            });
            setOffer({ ...offer, active: !offer.active });
            toast.success(!offer.active ? "Offer activated" : "Offer deactivated");
        } catch (error) {
            toast.error("Failed to update offer");
        } finally { setLoadingOffer(false); }
    };

    const toggleAnnouncement = async (id: string, currentActive: boolean) => {
        try {
            await axiosInstance.put(`/admin/announcements/${id}`, { isActive: !currentActive });
            setAnnouncements(announcements.map(a => a._id === id ? { ...a, isActive: !a.isActive } : a));
            toast.success(currentActive ? "Announcement deactivated" : "Announcement activated");
        } catch (error) {
            toast.error("Failed to update announcement");
        }
    };
    
    useEffect(() => {
        const interval = setInterval(() => {
            setHighlightIndex((prev) => (prev + 1) % 6);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const statCards = [
        { label: "Total Songs", value: stats.totalSongs, icon: Music, color: "text-blue-400", bg: "bg-blue-500/10" },
        { label: "Total Albums", value: stats.totalAlbums, icon: Disc, color: "text-purple-400", bg: "bg-purple-500/10" },
        { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-violet-400", bg: "bg-violet-500/10" },
        { label: "Pro Users", value: stats.totalPremium, icon: CreditCard, color: "text-orange-400", bg: "bg-orange-500/10" },
        { label: "Total Playlists", value: stats.totalPlaylists, icon: TrendingUp, color: "text-pink-400", bg: "bg-pink-500/10" },
        { label: "Revenue", value: `₹${stats.totalRevenue}`, icon: DollarSign, color: "text-green-400", bg: "bg-green-500/10" },
    ];

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6 fade-in">Dashboard</h1>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {statCards.map((stat, i) => (
                    <StatCard key={stat.label} {...stat} delay={i * 150} isHighlighted={i === highlightIndex} />
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="card bg-base-100 shadow-xl rounded-lg p-6 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Tag className="size-5 text-emerald-400" />
                            <h2 className="text-lg font-semibold">Active Offer</h2>
                        </div>
                        <button 
                            onClick={toggleOffer} 
                            disabled={loadingOffer || !offer}
                            className="flex items-center gap-2 text-sm"
                        >
                            {offer?.active ? (
                                <span className="flex items-center gap-1 text-emerald-400"><ToggleRight className="size-5" /> Active</span>
                            ) : (
                                <span className="flex items-center gap-1 text-base-content/60"><ToggleLeft className="size-5" /> Inactive</span>
                            )}
                        </button>
                    </div>
                    {offer ? (
                        <div className="bg-base-200/50 rounded-lg p-4">
                            <p className="text-2xl font-bold text-emerald-400">{offer.discount}% OFF</p>
                            <p className="text-sm text-base-content/60 mt-1">
                                {offer.planId === "monthly" ? "Monthly Plan" : offer.planId === "yearly" ? "Yearly Plan" : "All Plans"}
                            </p>
                        </div>
                    ) : (
                        <p className="text-base-content/60">No offer configured</p>
                    )}
                </div>

                <div className="card bg-base-100 shadow-xl rounded-lg p-6 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Megaphone className="size-5 text-amber-400" />
                            <h2 className="text-lg font-semibold">Active Announcements ({announcements.length})</h2>
                        </div>
                    </div>
                    {announcements.length > 0 ? (
                        <div className="space-y-2">
                            {announcements.slice(0, 3).map((ann) => (
                                <div key={ann._id} className="flex items-center justify-between bg-base-200/50 rounded-lg p-3">
                                    <p className="text-sm font-medium truncate flex-1">{ann.title}</p>
                                    <button 
                                        onClick={() => toggleAnnouncement(ann._id, ann.isActive)}
                                        className="text-xs text-red-400 hover:text-red-300 ml-2"
                                    >
                                        Stop
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-base-content/60">No active announcements</p>
                    )}
                </div>
            </div>

            {pinRequests.length > 0 && (
                <div className="card bg-base-100 shadow-xl rounded-lg p-6 border border-white/10 mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <KeyRound className="size-5 text-amber-400" />
                        <h2 className="text-lg font-semibold">PIN Reset Requests ({pinRequests.length})</h2>
                    </div>
                    <div className="space-y-3">
                        {pinRequests.map((req) => (
                            <div key={req._id} className="flex items-center justify-between py-3 px-4 bg-base-200/50 rounded-lg">
                                <div>
                                    <p className="font-medium">{req.fullName}</p>
                                    <p className="text-sm text-base-content/60">{req.email}</p>
                                    <p className="text-xs text-base-content/40">{new Date(req.createdAt).toLocaleString()}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleApprovePin(req._id)}
                                        disabled={processingId === req._id}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors text-sm disabled:opacity-50"
                                    >
                                        {processingId === req._id ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleRejectPin(req._id)}
                                        disabled={processingId === req._id}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm disabled:opacity-50"
                                    >
                                        <X className="size-3" /> Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {stats.recentPayments && stats.recentPayments.length > 0 && (
                <div className="card bg-base-100 shadow-xl rounded-lg p-6 border border-white/10 mb-8">
                    <h2 className="text-lg font-semibold mb-4">Recent Payments</h2>
                    <div className="space-y-3">
                        {stats.recentPayments.map((payment) => (
                            <div key={payment._id} className="flex items-center justify-between py-2 border-base-200 last:border-0">
                                <div><p className="font-medium">{payment.clerkId}</p><p className="text-sm text-base-content/60">{payment.plan} plan</p></div>
                                <div className="text-right"><p className="font-medium">₹{payment.amount}</p><span className={`text-xs px-2 py-0.5 rounded-full ${payment.status === "success" ? "bg-emerald-500/10 text-emerald-400" : payment.status === "pending" ? "bg-yellow-500/10 text-yellow-400" : "bg-red-500/10 text-red-400"}`}>{payment.status}</span></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {recentSongs.length > 0 && (
                <div className="card bg-base-100 shadow-xl rounded-lg p-6 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Recently Played Songs</h2>
                        <button
                            onClick={() => {
                                if (isPlaying && recentSongs.some(s => String(s._id) === String(currentSong?._id))) {
                                    togglePlay();
                                } else {
                                    playAlbum(recentSongs, 0);
                                }
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors text-sm"
                        >
                            {isPlaying && recentSongs.some(s => String(s._id) === String(currentSong?._id)) ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                            {isPlaying && recentSongs.some(s => String(s._id) === String(currentSong?._id)) ? "Pause" : "Play All"}
                        </button>
                    </div>
                    <div className="space-y-2">
                        {recentSongs.slice(0, 5).map((song, i) => (
                            <div key={song._id} className="flex items-center gap-3 py-2 px-3 bg-base-200/50 rounded-lg hover:bg-base-200 transition-colors">
                                <span className="text-sm text-base-content/60 w-5 text-center">{i + 1}</span>
                                <img src={optimizeImage(song.imageUrl, "sm")} alt={song.title} className="size-10 rounded object-cover" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{song.title}</p>
                                    <p className="text-xs text-base-content/60 truncate">{song.artist}</p>
                                </div>
                                <span className="text-xs text-base-content/60">{formatDuration(song.duration)}</span>
                                <button
                                    onClick={() => {
                                        if (String(currentSong?._id) === String(song._id)) {
                                            togglePlay();
                                        } else {
                                            playAlbum(recentSongs, i);
                                        }
                                    }}
                                    className="size-8 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center transition-all"
                                >
                                    {String(currentSong?._id) === String(song._id) && isPlaying ? (
                                        <Pause className="size-3.5 text-black" />
                                    ) : (
                                        <Play className="size-3.5 text-black ml-0.5" />
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
