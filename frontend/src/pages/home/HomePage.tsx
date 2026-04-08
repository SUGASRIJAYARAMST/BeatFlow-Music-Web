import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMusicStore } from "../../stores/useMusicStore";
import { useAnnouncementStore } from "../../stores/useAnnouncementStore";
import { useAuthStore } from "../../stores/useAuthStore";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { useLanguageStore } from "../../stores/useLanguageStore";
import { useSubscriptionStore } from "../../stores/useSubscriptionStore";
import Topbar from "../../components/layout/Topbar";
import { ScrollArea } from "../../components/ui/scroll-area";
import { SongCard } from "../../components/common/SongCard";
import PlayButton from "../../components/common/PlayButton";
import { Play, Clock, Music, Lock, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDuration, optimizeImage } from "../../lib/utils";
import toast from "react-hot-toast";

const SongCardSkeleton = () => (<div className='glass-dark p-4 rounded-3xl animate-pulse'><div className='w-full aspect-square bg-white/5 rounded-2xl mb-4' /><div className='h-4 bg-white/5 rounded w-3/4 mb-2' /><div className='h-3 bg-white/5 rounded w-1/2' /></div>);
const ListItemSkeleton =  () => (<div className='flex items-center gap-4 px-4 py-3 animate-pulse'><div className='size-6 bg-white/5 rounded' /><div className='size-10 bg-white/5 rounded' /><div className='flex-1'><div className='h-4 bg-white/5 rounded w-1/3 mb-2' /><div className='h-3 bg-white/5 rounded w-1/4' /></div></div>);

const HomePage = () => {
    const { 
        fetchAllHomeData,
        isLoading, 
        songs,
        albums,
        newSongs
    } = useMusicStore();
    const { fetchActiveAnnouncements, activeAnnouncements } = useAnnouncementStore();
    const { user } = useAuthStore();
    const authUser = useAuthStore((state) => state.user);
    const isPremium = useSubscriptionStore((state) => state.isPremium);
    const { recentSongs, refreshRecentSongs } = usePlayerStore();
    const { t } = useLanguageStore();
    const navigate = useNavigate();

    const isProUser = isPremium || authUser?.isPremium || authUser?.role === "admin";

    const handleLockedClick = (e: React.MouseEvent) => {
        e.preventDefault();
        toast.error("Upgrade to Pro to access premium content!");
        setTimeout(() => navigate("/premium"), 500);
    };

    const hour = new Date().getHours();
    const greetingKey = hour < 12 ? "home_greeting_morning" : hour < 18 ? "home_greeting_afternoon" : "home_greeting_evening";

    useEffect(() => { 
        fetchAllHomeData();
        fetchActiveAnnouncements();
        refreshRecentSongs();
    }, [fetchAllHomeData, fetchActiveAnnouncements, refreshRecentSongs]);

     useEffect(() => {
         const handleVisibilityChange = () => {
             if (document.visibilityState === "visible") {
                 fetchAllHomeData();
             }
         };
         document.addEventListener("visibilitychange", handleVisibilityChange);
         return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
     }, [fetchAllHomeData]);

    return (
        <div className='h-full bg-main-gradient relative overflow-hidden'>
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.05)_0%,transparent_50%)] pointer-events-none" />
            <Topbar />
            <ScrollArea className='h-[calc(100vh-220px)] md:h-[calc(100vh-180px)]'>
                <div className='p-4 md:p-6 lg:p-10 max-w-7xl mx-auto'>
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className='text-4xl font-black text-gradient tracking-tight mb-2'>
                                {t(greetingKey)}
                            </h1>
                            <p className="text-base-content/40 font-medium">{t("home_welcome")}, {authUser?.fullName || user?.fullName || "User"}.</p>
                        </div>
                    </div>

                    {activeAnnouncements.length > 0 && (
                        <div className='mb-12 space-y-4 fade-up'>
                            {activeAnnouncements.slice(0, 2).map((a) => (
                                <div key={a._id} className='glass-dark p-5 rounded-2xl border border-emerald-500/10 shadow-2xl'>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <h3 className='font-bold text-emerald-400 tracking-tight'>{a.title}</h3>
                                    </div>
                                    <p className='text-sm text-base-content/50 leading-relaxed'>{a.content}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className='mb-12 fade-up'>
                        <h2 className='text-2xl font-black mb-6 text-emerald-400/90 tracking-tighter uppercase'>{t("recently_listened")}</h2>
                        {isLoading ? (
                            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6'>
                                {Array.from({ length: 5 }).map((_, i) => <SongCardSkeleton key={i} />)}
                            </div>
                        ) : recentSongs.length > 0 ? (
                            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6'>
                                {recentSongs.slice(0, 5).map((song) => (
                                    <SongCard key={song._id} song={song} songs={recentSongs} />
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 glass rounded-3xl border-dashed border-white/5 text-center">
                                <p className='text-base-content/30 font-medium'>{t("no_recent")}</p>
                            </div>
                        )}
                    </div>

                    {newSongs.length > 0 && (
                        <div className='mb-12 fade-up delay-1'>
                            <h2 className='text-2xl font-black mb-6 text-emerald-400/90 tracking-tighter uppercase'>{t("new_releases")}</h2>
                            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6'>
                                {newSongs.slice(0, 10).map((song) => (
                                    <SongCard key={song._id} song={song} songs={newSongs} />
                                ))}
                            </div>
                        </div>
                    )}

                    {albums.length > 0 && (
                        <div className='mb-12 fade-up delay-1'>
                            <h2 className='text-2xl font-black mb-6 text-emerald-400/90 tracking-tighter uppercase'>New Albums</h2>
                            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6'>
                                {albums.slice(0, 10).map((album) => {
                                    const isLocked = album.isPremium && !isProUser;
                                    return (
                                        <Link 
                                            key={album._id} 
                                            to={isLocked ? "#" : `/albums/${album._id}`}
                                            className="group"
                                            onClick={(e) => isLocked && handleLockedClick(e)}
                                        >
                                            <div className={`glass-dark p-3 rounded-2xl hover:bg-white/10 transition-all duration-300 ${isLocked ? 'opacity-70' : ''}`}>
                                                <div className="relative">
                                                    <img 
                                                        src={album.imageUrl} 
                                                        alt={album.title}
                                                        className="w-full aspect-square object-cover rounded-xl mb-3 group-hover:scale-105 transition-transform duration-300" 
                                                    />
                                                    {album.isPremium && (
                                                        <div className="absolute top-2 right-2 bg-amber-500/90 backdrop-blur-sm rounded-full p-1.5">
                                                            {isLocked ? <Lock className="size-3 text-black" /> : <Crown className="size-3 text-black" />}
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="font-medium text-sm truncate">{album.title}</p>
                                                <p className="text-xs text-base-content/50 truncate">{album.artist}</p>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className='mb-12 fade-up delay-2'>
                        <h2 className='text-2xl font-black mb-6 text-emerald-400/90 tracking-tighter uppercase'>{t("all_songs")}</h2>
                        {isLoading ? (
                            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6'>
                                {Array.from({ length: 10 }).map((_, i) => <SongCardSkeleton key={i} />)}
                            </div>
                        ) : songs.length > 0 ? (
                            <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6'>
                                {songs.map((song) => (
                                    <SongCard key={song._id} song={song} songs={songs} />
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 glass rounded-3xl border-dashed border-white/5 text-center">
                                <p className='text-base-content/30 font-medium'>{t("library_empty")}</p>
                            </div>
                        )}
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
};

export default HomePage;
