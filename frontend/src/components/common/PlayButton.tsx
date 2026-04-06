import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { useSubscriptionStore } from "../../stores/useSubscriptionStore";
import { useAuthStore } from "../../stores/useAuthStore";
import { usePlaylistStore } from "../../stores/usePlaylistStore";
import { useMusicStore } from "../../stores/useMusicStore";
import { Play, Download, Lock, Plus, X, Heart } from "lucide-react";
import type { Song } from "../../types";
import { axiosInstance } from "../../lib/axios";
import toast from "react-hot-toast";

const PlayButton = ({ song, songs, showDownload }: { song: Song; songs?: Song[]; showDownload?: boolean }) => {
    const navigate = useNavigate();
    const { setCurrentSong, playAlbum } = usePlayerStore();
    const isPremium = useSubscriptionStore((state) => state.isPremium);
    const subscriptionPlan = useSubscriptionStore((state) => state.subscriptionPlan);
    const checkSubscription = useSubscriptionStore((state) => state.checkSubscription);
    const user = useAuthStore((state) => state.user);
    const { playlists, fetchPlaylists, addSongToPlaylist } = usePlaylistStore();
    const { toggleLike, likedSongs } = useMusicStore();
    const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

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

    const isLiked = likedSongs.some(s => s._id === song._id);
    const isYearlyPro = isPremium && subscriptionPlan === "yearly";

    const handlePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (song.isPremium && !isPremium && user?.role !== "admin") {
            toast.error("Pro subscription required");
            navigate("/premium");
            return;
        }
        if (songs) {
            const index = songs.findIndex((s) => s._id === song._id);
            playAlbum(songs, index >= 0 ? index : 0);
        } else {
            setCurrentSong(song);
        }
    };

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) return toast.error("Please login to like songs");
        await toggleLike(song._id);
    };

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) {
            toast.error("Please login to download");
            return;
        }
        if (subscriptionPlan !== "yearly" && user?.role !== "admin") {
            toast.error("Yearly Pro plan required to download songs");
            navigate("/premium");
            return;
        }
        
        try {
            const token = await window.Clerk?.session?.getToken();
            const response = await fetch(`${axiosInstance.defaults.baseURL}/download/${song._id}`, {
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
            toast.success("Download started!");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Download failed");
        }
    };

    const handleAddToPlaylist = async (playlistId: string) => {
        if (!user) {
            toast.error("Please login to add to playlists");
            return;
        }
        try {
            await addSongToPlaylist(playlistId, song._id);
            setShowPlaylistMenu(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to add to playlist");
        }
    };

    const togglePlaylistMenu = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) {
            toast.error("Please login first");
            return;
        }
        setShowPlaylistMenu(!showPlaylistMenu);
        if (!showPlaylistMenu && playlists.length === 0) {
            await fetchPlaylists();
        }
    };

    return (
        <div className='flex items-center gap-1.5 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all'>
            <button
                onClick={handleLike}
                className={cn(
                    "size-8 rounded-full shadow-lg flex items-center justify-center transition-all bg-base-content/20 hover:bg-base-content/30",
                    isLiked && "bg-emerald-500/20 text-emerald-500"
                )}
            >
                <Heart className={cn("size-3.5", isLiked && "fill-current")} />
            </button>
            
            <Button
                size='icon'
                className='size-8 rounded-full bg-emerald-500 hover:bg-emerald-400 shadow-lg'
                onClick={handlePlay}
            >
                {song.isPremium && !isPremium ? (
                    <Lock className='size-3.5 text-black' />
                ) : (
                    <Play className='size-3.5 text-black ml-0.5' />
                )}
            </Button>

            <button
                ref={buttonRef}
                onClick={togglePlaylistMenu}
                className='size-8 rounded-full bg-base-content/20 hover:bg-base-content/30 shadow-lg flex items-center justify-center transition-colors relative'
            >
                <Plus className='size-3.5 text-base-content' />
            </button>

            {showDownload && (
                <Button
                    size='icon'
                    className='size-8 rounded-full bg-base-content/20 hover:bg-base-content/30 shadow-lg'
                    onClick={handleDownload}
                >
                    <Download className='size-3.5 text-base-content' />
                </Button>
            )}

            {showPlaylistMenu && (
                <div ref={menuRef} className='absolute bottom-full right-0 mb-2 bg-base-200 rounded-lg shadow-xl border border-base-100 p-2 min-w-48 z-50'>
                    <div className='flex items-center justify-between mb-2 pb-2 border-b border-base-100'>
                        <span className='text-[10px] uppercase tracking-widest font-black text-emerald-400/80'>Add to Playlist</span>
                        <button onClick={(e) => { e.stopPropagation(); setShowPlaylistMenu(false); }}>
                            <X className='size-4 text-base-content/60 hover:text-base-content' />
                        </button>
                    </div>
                    {playlists.length === 0 ? (
                        <p className='text-xs text-base-content/60 py-2'>No playlists yet</p>
                    ) : (
                        playlists.map((playlist) => (
                            <button
                                key={playlist._id}
                                onClick={(e) => { e.stopPropagation(); handleAddToPlaylist(playlist._id); }}
                                className='w-full text-left px-3 py-2 rounded-md hover:bg-base-300 transition-colors text-sm truncate'
                            >
                                {playlist.name}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default PlayButton;
