import { Heart, Plus, Play, Pause, Lock, X, Check, Download } from "lucide-react";
import { useUser } from "@clerk/react";
import { useState, useEffect, useRef } from "react";
import { useMusicStore } from "../../stores/useMusicStore";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { useSubscriptionStore } from "../../stores/useSubscriptionStore";
import { useAuthStore } from "../../stores/useAuthStore";
import { usePlaylistStore } from "../../stores/usePlaylistStore";
import { cn, optimizeImage } from "../../lib/utils";
import { useNotificationStore } from "../../stores/useNotificationStore";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import type { Song } from "../../types";

interface SongCardProps {
    song: Song;
    songs: Song[];
}

export const SongCard = ({ song, songs }: SongCardProps) => {
    const { user } = useUser();
    const toggleLike = useMusicStore(s => s.toggleLike);
    const likedSongs = useMusicStore(s => s.likedSongs);
    const playAlbum = usePlayerStore(s => s.playAlbum);
    const currentSongId = usePlayerStore(s => s.currentSong?._id);
    const isPlaying = usePlayerStore(s => s.isPlaying);
    const togglePlay = usePlayerStore(s => s.togglePlay);
    const isPremium = useSubscriptionStore(s => s.isPremium);
    const authUser = useAuthStore(s => s.user);
    const authUserRole = useAuthStore(s => s.user?.role);
    const isProUser = isPremium || authUser?.isPremium || authUserRole === "admin";
    const { playlists, fetchPlaylists, addSongToPlaylist, removeSongFromPlaylist } = usePlaylistStore();
    const navigate = useNavigate();
    const isLiked = likedSongs.some(s => s._id === song._id);
    const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const hasFetched = useRef(false);

    useEffect(() => {
        if (showPlaylistMenu && user && !hasFetched.current) {
            fetchPlaylists();
            hasFetched.current = true;
        }
        if (!showPlaylistMenu) {
            hasFetched.current = false;
        }
    }, [showPlaylistMenu, user]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node) && 
                buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
                setShowPlaylistMenu(false);
            }
        };
        if (showPlaylistMenu) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showPlaylistMenu]);

    const handleLike = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            toast.error("Please login to like songs");
            return;
        }
        if (song.isPremium && !isProUser) {
            toast.error("Pro subscription required for premium songs");
            setTimeout(() => navigate("/premium"), 500);
            return;
        }
        toggleLike(song._id);
    };

    const handlePlay = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (song.isPremium && !isProUser) {
            toast.error("Pro subscription required");
            setTimeout(() => navigate("/premium"), 500);
            return;
        }
        if (currentSongId === song._id) {
            togglePlay();
        } else {
            const index = songs.findIndex((s) => s._id === song._id);
            playAlbum(songs, index >= 0 ? index : 0);
        }
    };

    const handleAddToPlaylist = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            toast.error("Please login first");
            return;
        }
        if (song.isPremium && !isProUser) {
            toast.error("Pro subscription required for premium songs");
            setTimeout(() => navigate("/premium"), 500);
            return;
        }
        if (showPlaylistMenu) {
            setShowPlaylistMenu(false);
            return;
        }
        await fetchPlaylists();
        setShowPlaylistMenu(true);
    };

    const handleSelectPlaylist = async (playlistId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const playlist = playlists.find(p => p._id === playlistId);
        const isInPlaylist = playlist?.songs?.some(
            (s) => (s.song as Song)?._id === song._id || (s.song as Song)?._id === song._id
        );
        try {
            if (isInPlaylist) {
                await removeSongFromPlaylist(playlistId, song._id);
            } else {
                await addSongToPlaylist(playlistId, song._id);
            }
            setShowPlaylistMenu(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed");
        }
    };

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const { addNotification } = useNotificationStore.getState();
        if (!user) {
            toast.error("Please login to download");
            return;
        }
        const subscriptionPlan = useSubscriptionStore.getState().subscriptionPlan;
        if (subscriptionPlan !== "yearly" && authUserRole !== "admin") {
            toast.error("Yearly Pro plan required to download songs");
            navigate("/premium");
            return;
        }
        try {
            const token = await window.Clerk?.session?.getToken();
            const response = await fetch(`/api/download/${song._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Download failed");
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${song.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_beatflow.mp3`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            addNotification(`Downloaded "${song.title}" successfully`, "success");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Download failed");
        }
    };

    const handleCardClick = (e: React.MouseEvent) => {
        if (song.isPremium && !isProUser) {
            e.preventDefault();
            e.stopPropagation();
            toast.error("Pro subscription required for premium songs");
            setTimeout(() => navigate("/premium"), 500);
            return;
        }
    };

    const hasAccess = !song.isPremium || isPremium || authUserRole === "admin";

    return (
        <div 
            className='group relative bg-[#181818] p-4 rounded-3xl hover:bg-[#282828] transition-all shadow-xl hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 duration-500'
            onClick={handleCardClick}
        >
            {/* Image & Overlays */}
            <div className='relative aspect-square mb-4 overflow-hidden rounded-2xl shadow-2xl'>
                <img 
                    src={optimizeImage(song.imageUrl, "lg")} 
                    alt={song.title} 
                    className='w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700' 
                    loading='lazy' 
                />
                
                {/* Dark Overlay on Hover */}
                <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 md:transition-opacity' />

                {/* Top Right Download Button */}
                <div className='absolute top-2 right-2 md:opacity-0 md:group-hover:opacity-100 md:-translate-y-2 md:group-hover:translate-y-0 transition-all'>
                    <button 
                        onClick={handleDownload}
                        className='size-9 rounded-full bg-white/90 hover:bg-emerald-500 hover:text-white text-emerald-600 shadow-lg flex items-center justify-center transition-all'
                    >
                        <Download className='size-4' />
                    </button>
                </div>

                {/* Bottom Actions */}
                <div className='absolute bottom-2 right-2 flex gap-1.5 md:opacity-0 md:group-hover:opacity-100 md:translate-y-2 md:group-hover:translate-y-0 transition-all'>
                    <button 
                        onClick={handleLike}
                        className={cn(
                            "size-9 rounded-full shadow-lg flex items-center justify-center transition-all",
                            isLiked ? "bg-emerald-500 text-white hover:bg-emerald-400" : "bg-white/90 text-emerald-600 hover:bg-emerald-500 hover:text-white"
                        )}
                    >
                        <Heart className={cn("size-4", isLiked && "fill-current")} />
                    </button>
                    <button 
                        ref={buttonRef}
                        onClick={handleAddToPlaylist}
                        className='size-9 rounded-full bg-white/90 hover:bg-emerald-500 hover:text-white text-emerald-600 shadow-lg flex items-center justify-center transition-all'
                    >
                        <Plus className='size-4' />
                    </button>
                    <button 
                        onClick={handlePlay}
                        className={cn(
                            "inline-flex items-center justify-center size-9 rounded-full shadow-lg transition-all",
                            hasAccess 
                                ? "bg-emerald-500 hover:bg-emerald-400" 
                                : "bg-red-500/80 hover:bg-red-400"
                        )}
                    >
                        {!hasAccess ? (
                            <Lock className='size-4 text-white' />
                        ) : currentSongId === song._id && isPlaying ? (
                            <Pause className='size-4 text-black' />
                        ) : (
                            <Play className='size-4 text-black ml-0.5' />
                        )}
                    </button>
                </div>

                {/* Lock Overlay for Premium Songs */}
                {!hasAccess && (
                    <div 
                        className='absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 pointer-events-none'
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className='size-12 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/50'>
                            <Lock className='size-6 text-emerald-400' />
                        </div>
                        <span className='text-[10px] uppercase tracking-widest font-black text-emerald-400/80'>Pro Only</span>
                    </div>
                )}
            </div>

            {/* Playlist Dropdown - outside overflow-hidden container */}
            {showPlaylistMenu && (
                <div ref={menuRef} className='absolute -top-5 right-2 bg-base-200 rounded-lg shadow-2xl border border-white/10 p-2 min-w-42 z-[100]'>
                    <div className='flex items-center justify-between mb-2 pb-2 border-b border-white/5'>
                        <span className='text-[10px] uppercase tracking-widest font-black text-emerald-400/80'>Add to Playlist</span>
                        <button onClick={(e) => { e.stopPropagation(); setShowPlaylistMenu(false); }}>
                            <X className='size-4 text-base-content/60 hover:text-base-content' />
                        </button>
                    </div>
                    {playlists.length === 0 ? (
                        <p className='text-xs text-base-content/60 py-2 text-center'>No playlists yet</p>
                    ) : (
                        <div className='space-y-1 max-h-48 overflow-y-auto'>
                            {playlists.map((playlist) => {
                                const isInPlaylist = playlist.songs?.some(
                                    (s) => (s.song as Song)?._id === song._id
                                );
                                return (
                                    <button
                                        key={playlist._id}
                                        onClick={(e) => handleSelectPlaylist(playlist._id, e)}
                                        className='w-full text-left px-3 py-2 rounded-md hover:bg-white/5 transition-colors text-sm truncate flex items-center justify-between'
                                    >
                                        <span className='truncate'>{playlist.name}</span >
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

            {/* Song Info */}
            <div className='px-1'>
                <p className='font-black truncate text-lg text-base-content/90 tracking-tight mb-1'>{song.title}</p>
                <div className='flex items-center justify-between gap-2 overflow-hidden'>
                    <p className='text-xs font-bold text-base-content/30 truncate uppercase tracking-widest'>{song.artist}</p>
                    <span className='px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500/70 text-[9px] font-black uppercase whitespace-nowrap'>
                        {song.genre}
                    </span>
                </div>
            </div>
        </div>
    );
};
