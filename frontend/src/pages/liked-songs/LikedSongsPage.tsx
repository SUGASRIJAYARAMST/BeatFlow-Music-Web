import { useEffect, useRef, useState } from "react";
import { useMusicStore } from "../../stores/useMusicStore";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { usePlaylistStore } from "../../stores/usePlaylistStore";
import { useNotificationStore } from "../../stores/useNotificationStore";
import Topbar from "../../components/layout/Topbar";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Button } from "../../components/ui/button";
import { Heart, Clock, Play, Pause, Plus, X, ListMusic } from "lucide-react";
import { formatDuration, optimizeImage } from "../../lib/utils";
import { cn } from "../../lib/utils";
import type { Song } from "../../types";
import { useUser } from "@clerk/react";
import { toast } from "react-hot-toast";

const LikedSongsPage = () => {
    const { likedSongs, fetchLikedSongs, toggleLike } = useMusicStore();
    const { user } = useUser();
    const currentSongId = usePlayerStore(s => s.currentSong?._id);
    const isPlaying = usePlayerStore(s => s.isPlaying);
    const togglePlay = usePlayerStore(s => s.togglePlay);
    const playAlbum = usePlayerStore(s => s.playAlbum);
    const { playlists, fetchPlaylists, addSongToPlaylist, removeSongFromPlaylist } = usePlaylistStore();
    const  [showPlaylistMenu, setShowPlaylistMenu] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => { fetchLikedSongs(); }, [fetchLikedSongs]);

    const isCurrentSongInLiked = likedSongs.some(s => String(s._id) === String(currentSongId));
    const isPlayingLiked = isPlaying && isCurrentSongInLiked;

    const handlePlay = (song: Song, index: number) => {
        if (String(currentSongId) === String(song._id)) {
            togglePlay();
        } else {
            playAlbum(likedSongs, index);
        }
    };

    const handleLike = async (e: React.MouseEvent, songId: string) => {
        e.stopPropagation();
        try { await toggleLike(songId); } catch {}
    };

    const handleAddToPlaylist = async (e: React.MouseEvent, songId: string) => {
        e.stopPropagation();
        if (!user) { toast.error("Please login first"); return; }
        if (showPlaylistMenu === songId) { setShowPlaylistMenu(null); return; }
        await fetchPlaylists();
        setShowPlaylistMenu(songId);
    };

    const handleSelectPlaylist = async (playlistId: string, songId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const playlist = playlists.find(p => p._id === playlistId);
            const isInPlaylist = playlist?.songs?.some(
                (s) => (s.song as Song)?._id === songId
            );
            if (isInPlaylist) {
                await removeSongFromPlaylist(playlistId, songId);
            } else {
                await addSongToPlaylist(playlistId, songId);
            }
            setShowPlaylistMenu(null);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed");
        }
    };

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

    return (
        <div className='h-full bg-base-300'>
            <Topbar />
            <ScrollArea className='h-[calc(100vh-220px)] md:h-[calc(100vh-180px)]'>
                <div className='p-4 md:p-6'>
                    <div className='flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 mb-6 md:mb-8'>
                        <div className='size-32 md:size-48 bg-gradient-to-br from-violet-700 to-zinc-900 rounded-lg flex items-center justify-center shrink-0'>
                            <Heart className='size-12 md:size-20 text-white' fill='white' />
                        </div>
                        <div className='text-center md:text-left'>
                            <p className='text-sm text-base-content/60 uppercase tracking-wider'>Playlist</p>
                            <h1 className='text-3xl md:text-5xl font-bold mt-2'>Liked Songs</h1>
                            <p className='text-sm text-base-content/60 mt-2'>{likedSongs.length} songs</p>
                            <Button onClick={() => {
                                if (isPlayingLiked) {
                                    togglePlay();
                                } else {
                                    playAlbum(likedSongs, 0);
                                }
                            }} className='mt-4 bg-violet-500 hover:bg-violet-400 text-white'>
                                {isPlayingLiked ? <Pause className='size-4 mr-1' /> : <Play className='size-4 mr-1' />} {isPlayingLiked ? "Pause" : "Play All"}
                            </Button>
                        </div>
                    </div>
                    {likedSongs.length === 0 ? (
                        <div className='text-center py-20'>
                            <Heart className='size-16 mx-auto text-base-content/60 mb-4' />
                            <h3 className='text-lg font-medium text-base-content/60'>No liked songs yet</h3>
                            <p className='text-sm text-base-content/60 mt-1'>Start liking songs to build your collection</p>
                        </div>
                    ) : (
                        <div className='bg-base-200/50 rounded-lg overflow-hidden'>
                            <div className='hidden md:flex items-center gap-4 px-4 py-3 border-b border-base-200 text-base-content/60 text-sm'>
                                <span className='w-6 text-center'>#</span>
                                <span className='flex-1'>Title</span>
                                <Clock className='size-4' />
                            </div>
                            {likedSongs.map((song, i) => (
                                <div key={song._id} className='group relative flex items-center gap-3 md:gap-4 px-3 md:px-4 py-2 md:py-3 hover:bg-base-200 transition-colors'>
                                    <span className='text-base-content/60 w-6 text-center text-sm md:group-hover:hidden'>{i + 1}</span>
                                    <span className='w-6 text-center text-sm hidden md:group-hover:block'>
                                        <button onClick={() => handlePlay(song, i)} className='text-base-content hover:text-emerald-400'>
                                            {currentSongId === song._id && isPlaying ? <Pause className='size-4' /> : <Play className='size-4' />}
                                        </button>
                                    </span>
                                    <img src={optimizeImage(song.imageUrl, "sm")} alt={song.title} className='size-10 md:size-10 rounded object-cover shrink-0' />
                                    <div className='flex-1 min-w-0'>
                                        <p className='font-medium truncate text-sm'>{song.title}</p>
                                        <p className='text-xs text-base-content/60 truncate'>{song.artist}</p>
                                    </div>
                                    <span className='text-xs md:text-sm text-base-content/60'>{formatDuration(song.duration)}</span>
                                    <div className='hidden md:flex items-center gap-1.5 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all'>
                                        <button
                                            onClick={(e) => handleLike(e, song._id)}
                                            className='size-8 rounded-full shadow-lg flex items-center justify-center transition-all hover:bg-base-content/30 bg-emerald-500/20 text-emerald-500'
                                        >
                                            <Heart className='size-3.5 fill-current' />
                                        </button>
                                        <div className='relative'>
                                            <button
                                                ref={showPlaylistMenu === song._id ? buttonRef : undefined}
                                                onClick={(e) => handleAddToPlaylist(e, song._id)}
                                                className='size-8 rounded-full bg-base-content/20 hover:bg-base-content/30 shadow-lg flex items-center justify-center transition-colors'
                                            >
                                                <Plus className='size-3.5 text-base-content' />
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
                                            {String(currentSongId) === String(song._id) && isPlaying ? (
                                                <Pause className='size-3.5 text-black' />
                                            ) : (
                                                <Play className='size-3.5 text-black ml-0.5' />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};

export default LikedSongsPage;
