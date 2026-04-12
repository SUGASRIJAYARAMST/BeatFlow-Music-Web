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
        <DialogContent className="bg-gradient-to-br from-base-200 via-base-100 to-base-200 shadow-2xl text-white max-w-2xl border-0 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-emerald-500/20 via-emerald-600/10 to-transparent" />
          <DialogHeader className="relative">
            <DialogTitle className="text-2xl font-bold flex items-center gap-3">
              <Edit className="size-6 text-emerald-400" />
              Edit Album
            </DialogTitle>
            <p className="text-sm text-base-content/60">Update album details below</p>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 pb-2">
            <div className="md:col-span-1 space-y-4">
              <div className="relative group">
                <div className="aspect-square rounded-xl overflow-hidden bg-base-100 border-2 border-dashed border-white/10 group-hover:border-emerald-500/50 transition-all">
                  {selectedAlbum?.imageUrl ? (
                    <img src={optimizeImage(selectedAlbum.imageUrl, 400)} alt={formData.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-base-content/40">
                      <Image className="size-12 mb-2" />
                      <span className="text-sm">No Image</span>
                    </div>
                  )}
                </div>
                {formData.isPremium && (
                  <div className="absolute top-2 right-2 bg-amber-500/90 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
                    <Crown className="size-3 text-black" />
                    <span className="text-xs font-bold text-black">PREMIUM</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="md:col-span-2 space-y-4">
              <div>
                <label className="text-xs font-medium text-emerald-400/80 uppercase tracking-wider mb-2 block">Title</label>
                <Input 
                  value={formData.title} 
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                  placeholder="Album title" 
                  className="bg-base-100/50 border-white/10 focus:border-emerald-500 text-base-content placeholder:text-base-content/40 h-12 text-lg" 
                />
              </div>
              <div>
                <label className="text-xs font-medium text-emerald-400/80 uppercase tracking-wider mb-2 block">Artist</label>
                <Input 
                  value={formData.artist} 
                  onChange={(e) => setFormData({ ...formData, artist: e.target.value })} 
                  placeholder="Artist name" 
                  className="bg-base-100/50 border-white/10 focus:border-emerald-500 text-base-content placeholder:text-base-content/40 h-12" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-emerald-400/80 uppercase tracking-wider mb-2 block">Genre</label>
                  <Select value={formData.genre} onValueChange={(v) => setFormData({ ...formData, genre: v })}>
                    <SelectTrigger className="bg-base-100/50 border-white/10 focus:border-emerald-500 text-base-content h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GENRES.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-emerald-400/80 uppercase tracking-wider mb-2 block">Release Year</label>
                  <Input 
                    value={formData.releaseYear ? String(formData.releaseYear) : ""} 
                    onChange={(e) => setFormData({ ...formData, releaseYear: parseInt(e.target.value) || 0 })} 
                    placeholder="2024" 
                    className="bg-base-100/50 border-white/10 focus:border-emerald-500 text-base-content placeholder:text-base-content/40 h-12" 
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500/10 to-transparent rounded-xl border border-amber-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Crown className="size-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Premium Album</p>
                    <p className="text-xs text-base-content/50">Only Pro users can access</p>
                  </div>
                </div>
                <Switch 
                  checked={formData.isPremium} 
                  onCheckedChange={(checked) => setFormData({ ...formData, isPremium: checked })} 
                />
              </div>
            </div>
          </div>
          
          <Button 
            onClick={handleUpdate} 
            disabled={isUpdating} 
            className="w-full mt-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-12"
          >
            {isUpdating ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Updating...
              </>
            ) : (
              <>
                <CheckCircle className="size-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAlbums;