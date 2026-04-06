import { useEffect, useState } from "react";
import { usePlaylistStore } from "../../stores/usePlaylistStore";
import Topbar from "../../components/layout/Topbar";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Plus, ListMusic, Trash2, Play, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { cn } from "../../lib/utils";

const PlaylistPage = () => {
    const { playlists, fetchPlaylists, createPlaylist, deletePlaylist, updatePlaylist } = usePlaylistStore();
    const [showCreate, setShowCreate] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [showEdit, setShowEdit] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");

    useEffect(() => { fetchPlaylists(); }, [fetchPlaylists]);

    const handleCreate = async () => {
        if (!newName.trim()) return toast.error("Please enter a name");
        await createPlaylist(newName, newDesc, "list");
        setShowCreate(false);
        setNewName("");
        setNewDesc("");
    };

    const handleDelete = async (id: string) => {
        await deletePlaylist(id);
        setShowDeleteConfirm(null);
    };

    const openEdit = (id: string) => {
        const pl = playlists.find(p => p._id === id);
        if (pl) {
            setEditName(pl.name);
            setEditDesc(pl.description || "");
            setShowEdit(id);
        }
    };

    const handleSaveEdit = async () => {
        if (!editName.trim() || !showEdit) return toast.error("Please enter a name");
        await updatePlaylist(showEdit, { name: editName, description: editDesc });
        setShowEdit(null);
        setEditName("");
        setEditDesc("");
    };

    const ORG_COLORS = [
        "from-emerald-500 to-teal-600",
        "from-violet-500 to-purple-600",
        "from-blue-500 to-indigo-600",
        "from-amber-500 to-orange-600",
    ];

    return (
        <div className='h-full bg-main-gradient'>
            <Topbar />
            <ScrollArea className='h-[calc(100vh-180px)]'>
                <div className='p-6 lg:p-10 max-w-7xl mx-auto'>
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className='text-4xl font-black text-gradient tracking-tight mb-1'>Playlists</h1>
                            <p className="text-base-content/40 font-medium">Your personal collections</p>
                        </div>
                        <button onClick={() => setShowCreate(true)} className='px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-full transition-colors flex items-center gap-2'>
                            <Plus className='size-4' /> Create
                        </button>
                    </div>

                    {playlists.length === 0 ? (
                        <div className='text-center py-20 glass-dark rounded-2xl border border-white/5'>
                            <ListMusic className='size-16 mx-auto text-base-content/20 mb-4' />
                            <h3 className='text-lg font-bold text-base-content/40 mb-2'>No playlists yet</h3>
                            <p className='text-base-content/30 mb-6'>Create your first playlist to get started</p>
                            <button onClick={() => setShowCreate(true)} className='px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-full transition-colors'>Create Playlist</button>
                        </div>
                    ) : (
                        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'>
                            {playlists.map((pl, i) => (
                                <div key={pl._id} className='group relative'>
                                    <Link to={`/playlists/${pl._id}`} className='block'>
                                        <div className={cn(
                                            "aspect-square rounded-xl flex items-center justify-center mb-3 relative overflow-hidden bg-gradient-to-br",
                                            ORG_COLORS[i % ORG_COLORS.length]
                                        )}>
                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all" />
                                            <ListMusic className='size-12 text-white/80 relative z-10 group-hover:scale-110 transition-transform' />
                                            <div className='absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'>
                                                <Play className='size-8 text-white' />
                                            </div>
                                        </div>
                                        <p className='font-bold text-base-content/90 truncate'>{pl.name}</p>
                                        <p className='text-xs text-base-content/30'>{pl.songs?.length || 0} songs</p>
                                    </Link>
                                    <div className='absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10'>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); openEdit(pl._id); }}
                                            className='p-1.5 rounded-full bg-blue-500/80 text-white hover:bg-blue-500 transition-all'
                                        >
                                            <Pencil className='size-3' />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setShowDeleteConfirm(pl._id); }}
                                            className='p-1.5 rounded-full bg-red-500/80 text-white hover:bg-red-500 transition-all'
                                        >
                                            <Trash2 className='size-3' />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>

            {showCreate && (
                <div className='fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4'>
                    <div className='bg-base-200 rounded-2xl p-6 max-w-md w-full border border-white/5'>
                        <h2 className='text-xl font-bold mb-4'>Create Playlist</h2>
                        <div className='space-y-4'>
                            <div>
                                <label className='text-sm text-base-content/40 mb-1 block'>Name</label>
                                <input
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder='My Playlist'
                                    className='w-full px-4 py-2.5 bg-base-100/50 border border-white/5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-base placeholder:text-base-content/30'
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className='text-sm text-base-content/40 mb-1 block'>Description</label>
                                <input
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    placeholder='Optional'
                                    className='w-full px-4 py-2.5 bg-base-100/50 border border-white/5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-base placeholder:text-base-content/30'
                                />
                            </div>
                            <div className='flex gap-3 pt-2'>
                                <button onClick={() => setShowCreate(false)} className='flex-1 py-2.5 bg-base-100/50 hover:bg-base-100 rounded-lg font-bold transition-colors'>Cancel</button>
                                <button onClick={handleCreate} className='flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg font-bold transition-colors'>Create</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showEdit && (
                <div className='fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4'>
                    <div className='bg-base-200 rounded-2xl p-6 max-w-md w-full border border-white/10 shadow-2xl'>
                        <h2 className='text-xl font-bold mb-4'>Edit Playlist</h2>
                        <div className='space-y-4'>
                            <div>
                                <label className='text-sm text-base-content/60 mb-1 block'>Name</label>
                                <input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className='w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 text-white placeholder:text-white/30'
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className='text-sm text-base-content/60 mb-1 block'>Description</label>
                                <input
                                    value={editDesc}
                                    onChange={(e) => setEditDesc(e.target.value)}
                                    className='w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 text-white placeholder:text-white/30'
                                />
                            </div>
                            <div className='flex gap-3 pt-2'>
                                <button onClick={() => setShowEdit(null)} className='flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg font-bold transition-colors'>Cancel</button>
                                <button onClick={handleSaveEdit} className='flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg font-bold transition-colors'>Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteConfirm && (
                <div className='fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4'>
                    <div className='bg-base-200 rounded-2xl p-6 max-w-sm w-full border border-white/5'>
                        <Trash2 className='size-10 text-red-400 mx-auto mb-3' />
                        <h3 className='text-lg font-bold text-center mb-2'>Delete Playlist?</h3>
                        <p className='text-base-content/40 text-center text-sm mb-6'>This action cannot be undone</p>
                        <div className='flex gap-3'>
                            <button onClick={() => setShowDeleteConfirm(null)} className='flex-1 py-2.5 bg-base-100/50 hover:bg-base-100 rounded-lg font-bold transition-colors'>Cancel</button>
                            <button onClick={() => handleDelete(showDeleteConfirm)} className='flex-1 py-2.5 bg-red-500 hover:bg-red-400 text-white rounded-lg font-bold transition-colors'>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlaylistPage;
