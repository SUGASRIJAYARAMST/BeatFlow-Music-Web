import { useEffect, useState } from "react";
import type { Album } from "../../types";
import { useMusicStore } from "../../stores/useMusicStore";
import { usePlayerStore } from "../../stores/usePlayerStore";
import { removeRecentSong, clearRecentSongs } from "../../utils/recentSongs";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Plus, Trash2, Edit, Loader2, CheckCircle, Image, Crown } from "lucide-react";
import { Switch } from "../../components/ui/switch";
import toast from "react-hot-toast";
import { optimizeImage } from "../../lib/utils";

const AdminAlbums = () => {
  const { albums, fetchAlbums, deleteAlbum } = useMusicStore();
  const [showEdit, setShowEdit] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [formData, setFormData] = useState<Album>({
    _id: "",
    title: "",
    artist: "",
    genre: "Other",
    imageUrl: "",
    releaseYear: 0,
    songs: [],
    isPremium: false,
    createdAt: "",
    updatedAt: ""
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filteredAlbums, setFilteredAlbums] = useState<Album[]>([]);

  useEffect(() => {
    fetchAlbums(true);
  }, [fetchAlbums]);

   useEffect(() => {
     if (searchTerm.trim() === "") {
       setFilteredAlbums(Array.isArray(albums) ? albums : []);
     } else {
       const filtered = Array.isArray(albums) ? albums.filter(album =>
         album.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
         album.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
         album.genre.toLowerCase().includes(searchTerm.toLowerCase())
       ) : [];
       setFilteredAlbums(filtered);
     }
   }, [albums, searchTerm]);

  const handleEdit = (album: Album) => {
    setSelectedAlbum(album);
    setFormData({
      ...album,
      _id: album._id || "",
      title: album.title || "" ,
      artist: album.artist || "",
      genre: album.genre || "Other",
      releaseYear: album.releaseYear || 0,
      isPremium: album.isPremium ?? false
    });
    setShowEdit(true);
  };

  const handleUpdate = async () => {
    if (!selectedAlbum?._id) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/albums/${selectedAlbum._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error("Failed to update album");
      }

      const data = await response.json();
      toast.success("Album updated successfully!");
      setShowEdit(false);
      // Refresh the albums list
      fetchAlbums();
    } catch (error: any) {
      toast.error(error.message || "Failed to update album");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const album = albums.find(a => a._id === id);
      const songIds = album?.songs?.map(s => s._id) || [];
      
      const playerStore = usePlayerStore.getState();
      if (playerStore.currentSong && songIds.includes(playerStore.currentSong._id)) {
        playerStore.setCurrentSong(null);
        playerStore.setIsPlaying(false);
      }
      const queueWithoutDeleted = playerStore.queue.filter(s => !songIds.includes(s._id));
      if (queueWithoutDeleted.length !== playerStore.queue.length) {
        if (queueWithoutDeleted.length > 0) {
            playerStore.setQueueAndPlay(queueWithoutDeleted, 0);
          } else {
          playerStore.setCurrentSong(null);
          playerStore.setIsPlaying(false);
        }
      }
      songIds.forEach(songId => removeRecentSong(songId, playerStore.userId));
      
      await deleteAlbum(id);
      toast.success("Album deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete album");
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
        <h1 className="text-2xl font-bold">Manage Albums</h1>
        <div className="flex gap-3">
          <Button onClick={() => window.location.href = "/admin/upload-album"}>
            <Plus className="size-4 mr-1" /> Upload New Album
          </Button>
          <Button 
            variant="outline" 
            onClick={() => fetchAlbums(true)}
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
          placeholder="Search albums by title, artist, or genre..."
          className="w-full max-w-xs"
        />
      </div>

      {albums.length === 0 ? (
        <div className="text-center py-20 bg-base-100 shadow-xl rounded-lg border border-white/10">
          <div className="flex items-center justify-center mb-4">
            <Loader2 className="size-8 text-base-content/60 animate-spin" />
          </div>
          <p className="text-base-content/60">Loading albums...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlbums.length === 0 && searchTerm.trim() !== "" ? (
            <div className="text-center py-10">
              <p className="text-base-content/60">No albums found matching "{searchTerm}"</p>
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
              {filteredAlbums.map((album) => (
                <div key={album._id} className="card bg-base-100 shadow-xl rounded-lg p-6 border border-white/10 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <img 
                        src={optimizeImage(album.imageUrl, "sm")} 
                        alt={album.title} 
                        className="size-8 rounded object-cover" 
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{album.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full border bg-violet-500/10 text-violet-400 border-violet-500/20`}>
                          {album.genre}
                        </span>
                        <p className="text-xs text-base-content/60 mt-1">
                          {album.artist} • {album.releaseYear || "Unknown Year"}
                        </p>
                      </div>
                    </div>
                    <p className="text-base-content/60 text-sm mt-2">
                      {album.songs?.length || 0} songs
                    </p>
                    <p className="text-xs text-base-content/60 mt-2">
                      {new Date(album.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEdit(album)}
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                    >
                      <Edit className="size-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(album._id)}
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

      {/* Edit Album Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="bg-base-100 shadow-xl text-white max-w-xl border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Album</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-2 pb-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-base-content/70 mb-4.5 block">Title *</label>
              <Input 
                value={formData.title} 
                onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                placeholder="Album title" 
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
              <label className="text-sm font-medium text-base-content/70 mb-4.5 block">Release Year</label>
              <Input 
                value={formData.releaseYear ? String(formData.releaseYear) : ""} 
                onChange={(e) => setFormData({ ...formData, releaseYear: parseInt(e.target.value) || 0 })} 
                placeholder="2024" 
                className="bg-base-200 border border-white/10 focus:border-emerald-500 text-base-content placeholder:text-base-content/40 h-12" 
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="size-4 text-amber-400" />
                <label className="text-sm font-medium text-base-content/70">Premium Album</label>
              </div>
              <Switch 
                checked={formData.isPremium} 
                onCheckedChange={(checked) => setFormData({ ...formData, isPremium: checked })} 
              />
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
                  Update Album
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAlbums;