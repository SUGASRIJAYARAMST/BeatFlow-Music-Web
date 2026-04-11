import { useEffect, useState } from "react";
import type { Song } from "../../types";
import { useMusicStore } from "../../stores/useMusicStore";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { removeRecentSong } from "../../utils/recentSongs";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Plus, Trash2, Edit, Loader2, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

const AdminSongs = () => {
  const { songs, fetchSongs, deleteSong } = useMusicStore();
  const [showEdit, setShowEdit] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [formData, setFormData] = useState<Song>({
    _id: "",
    title: "",
    artist: "" ,
    genre: "Other",
    albumId: null,
    imageUrl: "",
    audioUrl: "",
    duration: 0,
    isFeatured: false,
    isTrending: false,
    isPremium: false,
    createdAt: "",
    updatedAt: ""
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);

  useEffect(() => {
    console.log("🎯 Admin Songs page mounted, fetching songs...");
    fetchSongs(true);
  }, [fetchSongs]);

   useEffect(() => {
     console.log("🎵 Songs updated:", songs.length, "songs in store");
     if (searchTerm.trim() === "") {
       setFilteredSongs(Array.isArray(songs) ? songs : []);
     } else {
       const filtered = Array.isArray(songs) ? songs.filter(song =>
         song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
         song.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
         song.genre.toLowerCase().includes(searchTerm.toLowerCase())
       ) : [];
       setFilteredSongs(filtered);
     }
   }, [songs, searchTerm]);

  const handleEdit = (song: Song) => {
    setSelectedSong(song);
    setFormData({
      ...song,
      _id: song._id || "",
      title: song.title || "",
      artist: song.artist || "",
      genre: song.genre || "Other",
      isFeatured: song.isFeatured ?? false,
      isTrending: song.isTrending ?? false,
      isPremium: song.isPremium ?? false
    });
    setShowEdit(true);
  };

  const handleUpdate = async () => {
    if (!selectedSong?._id) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/songs/${selectedSong._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          artist: formData.artist,
          genre: formData.genre,
          isFeatured: formData.isFeatured,
          isTrending: formData.isTrending,
          isPremium: formData.isPremium
        })
      });

      if (!response.ok) {
        throw new Error("Failed to update song");
      }

      const data = await response.json();
      toast.success("Song updated successfully!");
      setShowEdit(false);
      // Refresh the songs list
      fetchSongs();
    } catch (error: any) {
      toast.error(error.message || "Failed to update song");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const playerStore = usePlayerStore.getState();
      if (playerStore.currentSong?._id === id) {
        playerStore.setCurrentSong(null);
        playerStore.setIsPlaying(false);
      }
      const queueWithoutDeleted = playerStore.queue.filter(s => s._id !== id);
      if (queueWithoutDeleted.length !== playerStore.queue.length) {
        playerStore.setQueueAndPlay(queueWithoutDeleted, 0);
      }
      removeRecentSong(id, playerStore.userId);
      await deleteSong(id);
      toast.success("Song deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete song");
    }
  };

  const GENRES = [
    "Pop", "Rock", "Hip-Hop", "Rap", "R&B", "Soul", "Jazz", "Blues",
    "Country", "Folk", "Electronic", "EDM", "House", "Techno", "Trance",
    "Classical", "Reggae", "Latin", "K-Pop", "J-Pop", "Metal", "Punk rock", "Alternative rock", "Other"
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Manage Songs</h1>
        <div className="flex gap-3">
          <Button onClick={() => window.location.href = "/admin/upload-song"}>
            <Plus className="size-4 mr-1" /> Upload New Song
          </Button>
          <Button 
            variant="outline" 
            onClick={() => fetchSongs(true)}
            className="border-white/10 hover:bg-white/10"
          >
            <Loader2 className="size-4 mr-1 animate-spin" /> Refresh
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search songs by title, artist, or genre..."
          className="w-full max-w-xs"
        />
      </div>

      {songs.length === 0 ? (
        <div className="text-center py-20 bg-base-100 shadow-xl rounded-lg border border-white/10">
          <div className="flex items-center justify-center mb-4">
            <Loader2 className="size-8 text-base-content/60 animate-spin" />
          </div>
          <p className="text-base-content/60">Loading songs...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSongs.length === 0 && searchTerm.trim() !== "" ? (
            <div className="text-center py-10">
              <p className="text-base-content/60">No songs found matching "{searchTerm}"</p>
              <Button 
                variant="outline" 
                onClick={() => setSearchTerm("")}
                className="mt-4"
              >
                Clear Search
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSongs.map((song) => (
                <div key={song._id} className="card bg-base-100 shadow-xl rounded-lg p-6 border border-white/10 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{song.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full border bg-violet-500/10 text-violet-400 border-violet-500/20`}>
                        {song.genre}
                      </span>
                      <div className="flex gap-2">
                        {song.isFeatured && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Featured</span>}
                        {song.isTrending && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border-orange-500/20">Trending</span>}
                        {song.isPremium && <span className="text-xs px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border-pink-500/20">Pro Only</span>}
                      </div>
                    </div>
                    <p className="text-base-content/60 text-sm">{song.artist}</p>
                    <p className="text-xs text-base-content/60 mt-2">
                      {new Date(song.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEdit(song)}
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                    >
                      <Edit className="size-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(song._id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Song Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="bg-base-100 shadow-xl text-white max-w-xl border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Song</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-2 pb-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-base-content/70 mb-4.5 block">Title *</label>
              <Input 
                value={formData.title} 
                onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                placeholder="Song title" 
                className="bg-base-200 border border-white/10 focus:border-emerald-500 text-base-content placeholder:text-base-content/40 h-12" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-base-content/70 mb-4.5 block">Artist *</label>
              <Input 
                value={formData.artist} 
                onChange={(e) => setFormData({ ...formData, artist: e.target.value })} 
                placeholder="Artist name" 
                className="bg-base-200 border border-white/10 focus:border-emerald-500 text-base-content placeholder:text-base-content/40 h-12" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-base-content/70 mb-4.5 block">Genre</label>
              <Select value={formData.genre} onValueChange={(v) => setFormData({ ...formData, genre: v })}>
                <SelectTrigger className="bg-base-200 border border-white/10 focus:border-emerald-500 text-base-content h-12 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GENRES.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-base-content/70 mb-4.5 block">Status</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                    className="h-4 w-4 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-base-content/70">Featured</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isTrending}
                    onChange={(e) => setFormData({ ...formData, isTrending: e.target.checked })}
                    className="h-4 w-4 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm text-base-content/70">Trending</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPremium}
                    onChange={(e) => setFormData({ ...formData, isPremium: e.target.checked })}
                    className="h-4 w-4 text-pink-500 focus:ring-pink-500"
                  />
                  <span className="text-sm text-base-content/70">Pro Only</span>
                </label>
              </div>
            </div>
            <Button 
              onClick={handleUpdate} 
              disabled={isUpdating} 
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-12"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle className="size-4 mr-2" />
                  Update Song
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSongs;