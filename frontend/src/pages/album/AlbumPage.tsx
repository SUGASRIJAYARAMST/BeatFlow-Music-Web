import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useMusicStore } from "../../stores/useMusicStore";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { usePlaylistStore } from "../../stores/usePlaylistStore";
import { useSubscriptionStore } from "../../stores/useSubscriptionStore";
import { useAuthStore } from "../../stores/useAuthStore";
import Topbar from "../../components/layout/Topbar";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Button } from "../../components/ui/button";
import { Play, Pause, Clock, Music, Loader2, Heart, Plus, X, Crown, Lock, Zap } from "lucide-react";
import { formatDuration, optimizeImage } from "../../lib/utils";
import type { Song } from "../../types";
import { useUser } from "@clerk/react";
import { toast } from "react-hot-toast";
import { cn } from "../../lib/utils";

const AlbumPage = () => {
    const { albumId } = useParams<{ albumId: string }>();
    const navigate = useNavigate();
    const { fetchAlbumById, toggleLike, likedSongs } = useMusicStore();
    const isPremium = useSubscriptionStore((state) => state.isPremium);
    const authUser = useAuthStore((state) => state.user);
    const isProUser = isPremium || authUser?.isPremium || authUser?.role === "admin";
    const { playAlbum, currentSong, isPlaying, togglePlay } = usePlayerStore();
    const { playlists, fetchPlaylists, addSongToPlaylist, removeSongFromPlaylist } = usePlaylistStore();
    const { user } = useUser();
    const [notFound, setNotFound] = useState(false);
    const [showPlaylistMenu, setShowPlaylistMenu] = useState<string | null>(null);
    const [showProModal, setShowProModal] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const currentError = useMusicStore((state) => state.error);
    const isLoading = useMusicStore((state) => state.isLoading);
    const currentAlbum = useMusicStore((state) => state.currentAlbum);

    useEffect(() => { 
        if (albumId) { 
            setNotFound(false); 
            setShowProModal(false);
            fetchAlbumById(albumId); 
        } 
    }, [albumId]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node) && 
                buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
                setShowPlaylistMenu(null);
            }
        };
        if (showPlaylistMenu) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showPlaylistMenu]);

    const handlePlay = (song: Song, index: number) => {
        if (currentAlbum?.isPremium && !isProUser) {
            toast.error("Pro subscription required for this album");
            return;
        }
        if (String(currentSong?._id) === String(song._id)) {
            togglePlay();
        } else {
            playAlbum(currentAlbum?.songs || [], index);
        }
    };

    const handleLike = async (e: React.MouseEvent, songId: string) => {
        e.stopPropagation();
        if (!user) {
            toast.error("Please login to like songs");
            return;
        }
        try {
            await toggleLike(songId);
        } catch (error) {
            console.error("Like error:", error);
        }
    };

    const handleAddToPlaylist = async (e: React.MouseEvent, songId: string) => {
        e.stopPropagation();
        if (!user) {
            toast.error("Please login first");
            return;
        }
        if (showPlaylistMenu === songId) {
            setShowPlaylistMenu(null);
            return;
        }
        await fetchPlaylists();
        setShowPlaylistMenu(songId);
    };

    const handleSelectPlaylist = async (playlistId: string, songId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const playlist = playlists.find(p => p._id === playlistId);
            const isInPlaylist = playlist?.songs?.some(
                (s: any) => s.song?._id === songId || s._id === songId
            );
            if (isInPlaylist) {
                await removeSongFromPlaylist(playlistId, songId);
            } else {
                await addSongToPlaylist(playlistId, songId);
            }
            setShowPlaylistMenu(null);
            await fetchPlaylists(true);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed");
        }
    };

    const isProError = currentError && (currentError.includes("Pro") || currentError.includes("403"));
    const showNotFound = notFound || (!currentAlbum && !isProError);
    
    if (isLoading) return (<div className='h-full bg-base-300 flex items-center justify-center'><Loader2 className='size-8 text-violet-400 animate-spin' /></div>);
    if (showNotFound) return (<div className='h-full bg-base-300 flex flex-col items-center justify-center'><Music className='size-16 text-base-content/60 mb-4' /><h2 className='text-xl font-bold mb-2'>Album not found</h2><Link to='/home'><Button variant='outline'>Go Home</Button></Link></div>);
    if (isProError && !currentAlbum && !isLoading) {
        return (
            <div className='h-full bg-base-300 flex items-center justify-center'>
                <div className='text-center'>
                    <Lock className='size-16 text-amber-400 mx-auto mb-4' />
                    <h2 className='text-xl font-bold mb-2'>Pro Album</h2>
                    <p className='text-base-content/60 mb-4'>Only Pro users can access this album</p>
                    <Button onClick={() => navigate("/premium")} className='bg-gradient-to-r from-amber-500 to-violet-500 text-black font-bold'>
                        <Zap className='size-4 mr-1' /> Explore Pro Plans
                    </Button>
                </div>
            </div>
        );
    }

    if (!currentAlbum) return null;

    return (
        <div className='h-full bg-base-300'>
            <Topbar />
            <ScrollArea className='h-[calc(100vh-220px)] md:h-[calc(100vh-180px)]'>
                <div className='p-4 md:p-6'>
                    <div className='flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 mb-6 md:mb-8'>
                        <div className='relative'>
                            <img src={optimizeImage(currentAlbum.imageUrl, "lg")} alt={currentAlbum.title} className='size-32 md:size-48 rounded-lg object-cover shadow-2xl' />
                            {currentAlbum.isPremium && (
                                <div className='absolute top-2 right-2 bg-amber-500/90 backdrop-blur-sm rounded-full p-1.5'>
                                    <Crown className='size-4 text-black' />
                                </div>
                            )}
                        </div>
                        <div>
                            <div className='flex items-center gap-2'>
                                <p className='text-sm text-base-content/60 uppercase tracking-wider'>Album</p>
                                {currentAlbum.isPremium && !isProUser && (
                                    <span className='text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-semibold flex items-center gap-1'>
                                        <Lock className='size-3' /> Pro
                                    </span>
                                )}
                            </div>
                            <h1 className='text-5xl font-bold mt-2'>{currentAlbum.title}</h1>
                            <p className='text-base-content/60 mt-2'>{currentAlbum.artist} • {currentAlbum.releaseYear} • {currentAlbum.songs?.length || 0} songs</p>
                            <Button onClick={() => {
                                const firstSong = currentAlbum.songs?.[0];
                                if (firstSong && String(currentSong?._id) === String(firstSong._id)) {
                                    togglePlay();
                                } else {
                                    playAlbum(currentAlbum.songs || [], 0);
                                }
                            }} className='mt-4 bg-violet-500 hover:bg-violet-400 text-white'>
                                {isPlaying && currentAlbum.songs?.[0] && String(currentSong?._id) === String(currentAlbum.songs[0]._id) ? (
                                    <><Pause className='size-4 mr-1' /> Pause</>
                                ) : (
                                    <><Play className='size-4 mr-1' /> Play</>
                                )}
                            </Button>
                        </div>
                    </div>
                    {currentAlbum.songs && currentAlbum.songs.length > 0 ? (
                        <div className='bg-base-200/50 rounded-lg overflow-hidden'>
                            <div className='flex items-center gap-4 px-4 py-3 border-b border-base-200 text-base-content/60 text-sm'>
                                <span className='w-6 text-center'>#</span>
                                <span className='flex-1'>Title</span>
                                <Clock className='size-4' />
                            </div>
                            {currentAlbum.songs.map((song, i) => {
                                const isLiked = likedSongs.some((s) => s._id === song._id);
                                return (
                                    <div key={song._id} className='group relative flex items-center gap-4 px-4 py-3 hover:bg-base-200 transition-colors'>
                                        <span className='text-base-content/60 w-6 text-center text-sm group-hover:hidden'>{i + 1}</span>
                                        <span className='w-6 text-center text-sm hidden group-hover:block'>
                                            <button onClick={() => handlePlay(song, i)} className='text-base-content hover:text-emerald-400'>
                                                {String(currentSong?._id) === String(song._id) && isPlaying ? <Pause className='size-4' /> : <Play className='size-4' />}
                                            </button>
                                        </span>
                                        <img src={optimizeImage(song.imageUrl, "sm")} alt={song.title} className='size-10 rounded object-cover' loading='lazy' />
                                        <div className='flex-1 min-w-0'>
                                            <p className='font-medium truncate'>{song.title}</p>
                                            <p className='text-sm text-base-content/60 truncate'>{song.artist}</p>
                                        </div>
                                        <span className='text-sm text-base-content/60'>{formatDuration(song.duration)}</span>
                                        <div className='flex items-center gap-1.5 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all'>
                                            <button
                                                onClick={(e) => handleLike(e, song._id)}
                                                className={cn(
                                                    "size-8 rounded-full shadow-lg flex items-center justify-center transition-all",
                                                    isLiked ? "bg-emerald-500 text-white hover:bg-emerald-400" : "bg-white/90 text-emerald-600 hover:bg-emerald-500 hover:text-white"
                                                )}
                                            >
                                                <Heart className={cn("size-3.5", isLiked && "fill-current")} />
                                            </button>
                                            <div className='relative'>
                                                <button
                                                    ref={showPlaylistMenu === song._id ? buttonRef : undefined}
                                                    onClick={(e) => handleAddToPlaylist(e, song._id)}
                                                    className='size-8 rounded-full bg-white/90 hover:bg-emerald-500 hover:text-white text-emerald-600 shadow-lg flex items-center justify-center transition-all'
                                                >
                                                    <Plus className='size-3.5' />
                                                </button>
                                                {showPlaylistMenu === song._id && (
                                                    <div ref={menuRef} className='absolute bottom-full right-0 mb-2 bg-base-200 rounded-lg shadow-2xl border border-white/10 p-2 min-w-56 z-[100]'>
                                                        <div className='flex items-center justify-between mb-2 pb-2 border-b border-white/5'>
                                                            <span className='text-[10px] uppercase tracking-widest font-black text-emerald-400/80'>Add to Playlist</span>
                                                            <button onClick={(e) => { e.stopPropagation(); setShowPlaylistMenu(null); }}>
                                                                <X className='size-4 text-base-content/60 hover:text-base-content' />
                                                            </button>
                                                        </div>
                                                        {playlists.length === 0 ? (
                                                            <p className='text-xs text-base-content/60 py-2 text-center'>No playlists yet</p>
                                                        ) : (
                                                            <div className='space-y-1 max-h-48 overflow-y-auto'>
                                                                {playlists.map((playlist) => {
                                                                    const isInPlaylist = playlist.songs?.some(
                                                                        (s: any) => s.song?._id === song._id || s._id === song._id
                                                                    );
                                                                    return (
                                                                        <button
                                                                            key={playlist._id}
                                                                            onClick={(e) => handleSelectPlaylist(playlist._id, song._id, e)}
                                                                            className='w-full text-left px-3 py-2 rounded-md hover:bg-white/5 transition-colors text-sm truncate flex items-center justify-between'
                                                                        >
                                                                            <span className='truncate'>{playlist.name}</span>
                                                                            {isInPlaylist ? (
                                                                                <span className='text-xs text-emerald-400 shrink-0 ml-2'>Added</span>
                                                                            ) : (
                                                                                <span className='text-xs text-base-content/30 shrink-0 ml-2'>Add</span>
                                                                            )}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handlePlay(song, i)}
                                                className='size-8 rounded-full bg-emerald-500 hover:bg-emerald-400 shadow-lg flex items-center justify-center transition-all'
                                            >
                                                {String(currentSong?._id) === String(song._id) && isPlaying ? (
                                                    <Pause className='size-3.5 text-black' />
                                                ) : (
                                                    <Play className='size-3.5 text-black ml-0.5' />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className='text-center py-20'>
                            <Music className='size-16 mx-auto text-base-content/60 mb-4' />
                            <h3 className='text-lg font-medium text-base-content/60'>No songs in this album</h3>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Pro Access Modal */}
            {showProModal && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowProModal(false)}>
                    <div className="bg-gradient-to-br from-amber-500/10 to-violet-500/10 border border-amber-500/30 rounded-2xl p-8 max-w-md w-full text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="size-20 mx-auto bg-gradient-to-br from-amber-500 to-violet-600 rounded-full flex items-center justify-center mb-6">
                            <Lock className="size-10 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Pro Album</h2>
                        <p className="text-gray-400 mb-6">This album is available exclusively for Pro subscribers. Upgrade your plan to unlock this and many more premium features.</p>
                        
                        <div className="space-y-3 mb-6 text-left">
                            {["Exclusive Pro Albums", "Download Songs", "Priority Support", "Ad-Free Experience"].map((feature) => (
                                <div key={feature} className="flex items-center gap-3 text-sm text-gray-300">
                                    <Crown className="size-4 text-amber-400 shrink-0" />
                                    <span>{feature}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setShowProModal(false)} className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium transition-colors">
                                Maybe Later
                            </button>
                            <button onClick={() => navigate("/premium")} className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-violet-500 hover:from-amber-400 hover:to-violet-400 rounded-lg text-black font-bold transition-all flex items-center justify-center gap-2">
                                <Zap className="size-4" /> Explore Pro Plans
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AlbumPage;
