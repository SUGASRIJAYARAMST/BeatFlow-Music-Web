import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePlaylistStore } from "../../stores/usePlaylistStore";
import { usePlayerStore } from "../../stores/usePlayerStore";
import Topbar from "../../components/layout/Topbar";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Play, Pause, Clock, ArrowLeft, ListMusic, Trash2, Music, Loader2, Pencil, X } from "lucide-react";
import type { Song } from "../../types";
import { formatDuration, optimizeImage } from "../../lib/utils";

const PlaylistDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { currentPlaylist, fetchPlaylistById, removeSongFromPlaylist, updatePlaylist } = usePlaylistStore();
    const { playAlbum, currentSong, isPlaying, togglePlay } = usePlayerStore();
    const [isLoading, setIsLoading] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");

    useEffect(() => { if (id) { setIsLoading(true); fetchPlaylistById(id).finally(() => setIsLoading(false)); } }, [id, fetchPlaylistById]);
    useEffect(() => {
        if (currentPlaylist) {
            setEditName(currentPlaylist.name);
            setEditDesc(currentPlaylist.description || "");
        }
    }, [currentPlaylist]);

    const songs = (currentPlaylist?.songs || []).map((s: any) => s.song || s).filter(Boolean) as Song[];

    const handlePlayAll = () => {
        if (songs.length > 0) {
            const firstSong = songs[0];
            if (String(currentSong?._id) === String(firstSong._id)) {
                togglePlay();
            } else {
                playAlbum(songs, 0);
            }
        }
    };

    const handlePlaySong = (song: Song, index: number) => {
        if (songs.length > 0) {
            if (String(currentSong?._id) === String(song._id)) {
                togglePlay();
            } else {
                playAlbum(songs, index);
            }
        }
    };

    const handleSaveEdit = async () => {
        if (!editName.trim() || !id) return;
        await updatePlaylist(id, { name: editName, description: editDesc });
        setShowEdit(false);
    };

    if (isLoading) return (<div className='h-full bg-main-gradient flex items-center justify-center'><Loader2 className='size-8 text-emerald-400 animate-spin' /></div>);
    if (!currentPlaylist) return (
        <div className='h-full bg-main-gradient flex flex-col items-center justify-center'>
            <Music className='size-16 text-base-content/20 mb-4' />
            <h2 className='text-xl font-bold text-base-content/40 mb-4'>Playlist not found</h2>
            <button onClick={() => navigate("/playlists")} className='px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full font-bold transition-colors'>Back to Playlists</button>
        </div>
    );

    const totalDuration = songs.reduce((acc, s) => acc + (s.duration || 0), 0) || 0;

    return (
        <div className='h-full bg-main-gradient'>
            <Topbar />
            <ScrollArea className='h-[calc(100vh-220px)] md:h-[calc(100vh-180px)]'>
                <div className='p-4 md:p-6 lg:p-10 max-w-5xl mx-auto'>
                    <button onClick={() => navigate("/playlists")} className='inline-flex items-center gap-2 text-base-content/40 hover:text-base-content mb-4 md:mb-6 transition-colors'>
                        <ArrowLeft className='size-4' /> Back to Playlists
                    </button>

                    <div className='flex flex-col md:flex-row items-center md:items-end gap-4 md:gap-6 mb-6 md:mb-8'>
                        <div className='size-32 md:size-48 bg-base-200/50 rounded-2xl flex items-center justify-center shrink-0 border border-white/5 shadow-2xl relative group'>
                            <ListMusic className='size-16 text-emerald-400/60' />
                            <button onClick={() => setShowEdit(true)} className='absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl'>
                                <Pencil className='size-6 text-white' />
                            </button>
                        </div>
                        <div>
                            <p className='text-xs font-bold text-base-content/30 uppercase tracking-widest'>Playlist</p>
                            <h1 className='text-4xl font-black text-gradient tracking-tight mt-1 mb-2'>{currentPlaylist.name}</h1>
                            {currentPlaylist.description && <p className='text-base-content/40 mb-3'>{currentPlaylist.description}</p>}
                            <p className='text-sm text-base-content/30'>{songs.length} songs • {formatDuration(totalDuration)}</p>
                            {songs.length > 0 ? (
                                <button onClick={handlePlayAll} className='mt-4 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-full transition-colors flex items-center gap-2'>
                                    {isPlaying && songs[0] && String(currentSong?._id) === String(songs[0]._id) ? <><Pause className='size-4' /> Pause</> : <><Play className='size-4' /> Play All</>}
                                </button>
                            ) : (
                                <button onClick={() => navigate("/home")} className='mt-4 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-full transition-colors flex items-center gap-2'>
                                    <Play className='size-4' /> Add Songs
                                </button>
                            )}
                        </div>
                    </div>

                    <div className='mb-8'>
                        <div className='bg-base-200/30 rounded-xl overflow-hidden border border-white/5'>
                            <div className='flex items-center gap-4 px-4 py-3 border-b border-white/5 text-base-content/30 text-xs font-bold uppercase tracking-widest'>
                                <span className='w-6 text-center'>#</span>
                                <span className='w-10'></span>
                                <span className='flex-1'>Title</span>
                                <Clock className='size-3.5' />
                            </div>
                            {songs.map((song: Song, i: number) => (
                                <div key={song._id} className='group flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors'>
                                    <span className='text-base-content/30 w-6 text-center text-sm group-hover:hidden'>{i + 1}</span>
                                    <button onClick={() => handlePlaySong(song, i)} className='size-6 hidden group-hover:flex items-center justify-center text-emerald-400'>
                                        {String(currentSong?._id) === String(song._id) && isPlaying ? <Pause className='size-4' /> : <Play className='size-4' />}
                                    </button>
                                    {song.imageUrl ? <img src={optimizeImage(song.imageUrl, "sm")} alt={song.title} className='size-10 rounded-lg object-cover' loading='lazy' /> : <div className='size-10 bg-base-200 rounded-lg flex items-center justify-center'><Music className='size-4 text-base-content/30' /></div>}
                                    <div className='flex-1 min-w-0'>
                                        <p className='font-bold text-base-content/90 truncate'>{song.title}</p>
                                        <p className='text-xs text-base-content/30 truncate'>{song.artist}</p>
                                    </div>
                                    <span className='text-sm text-base-content/30'>{formatDuration(song.duration)}</span>
                                    <button onClick={() => removeSongFromPlaylist(currentPlaylist._id, song._id)} className='opacity-0 group-hover:opacity-100 p-1.5 text-base-content/30 hover:text-red-400 transition-all'>
                                        <Trash2 className='size-4' />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {songs.length === 0 && (
                        <div className='text-center py-20 bg-base-200/30 rounded-xl border border-white/5'>
                            <Music className='size-12 mx-auto text-base-content/20 mb-4' />
                            <h3 className='text-lg font-bold text-base-content/40 mb-2'>No songs yet</h3>
                            <p className='text-base-content/30 mb-4'>Add songs from your library</p>
                            <button onClick={() => navigate("/home")} className='px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-full transition-colors'>Browse Songs</button>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {showEdit && (
                <div className='fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4'>
                    <div className='bg-base-200 rounded-2xl p-6 max-w-md w-full border border-white/5'>
                        <div className='flex items-center justify-between mb-4'>
                            <h2 className='text-xl font-bold'>Edit Playlist</h2>
                            <button onClick={() => setShowEdit(false)} className='p-1 text-base-content/40 hover:text-base-content transition-colors'>
                                <X className='size-5' />
                            </button>
                        </div>
                        <div className='space-y-4'>
                            <div>
                                <label className='text-sm text-base-content/40 mb-1 block'>Name</label>
                                <input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className='w-full px-4 py-2.5 bg-base-100/50 border border-white/5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-base'
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className='text-sm text-base-content/40 mb-1 block'>Description</label>
                                <input
                                    value={editDesc}
                                    onChange={(e) => setEditDesc(e.target.value)}
                                    className='w-full px-4 py-2.5 bg-base-100/50 border border-white/5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-base'
                                />
                            </div>
                            <div className='flex gap-3 pt-2'>
                                <button onClick={() => setShowEdit(false)} className='flex-1 py-2.5 bg-base-100/50 hover:bg-base-100 rounded-lg font-bold transition-colors'>Cancel</button>
                                <button onClick={handleSaveEdit} className='flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg font-bold transition-colors'>Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlaylistDetailPage;
