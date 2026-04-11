import { useState, useRef } from "react";
import { axiosInstance } from "../../lib/axios";
import { useMusicStore } from "../../stores/useMusicStore";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Upload, Plus, Trash2, Loader2, Crown } from "lucide-react";
import toast from "react-hot-toast";
import { GENRES } from "../../lib/utils";
import { Switch } from "../../components/ui/switch";

interface SongEntry { title: string; duration: number | null; imageFile: File | null; }

const AdminUploadAlbum = () => {
    const { fetchSongs, fetchAllHomeData } = useMusicStore();
    const [albumTitle, setAlbumTitle] = useState("");
    const [albumArtist, setAlbumArtist] = useState("");
    const [albumGenre, setAlbumGenre] = useState("Other");
    const [albumYear, setAlbumYear] = useState("");
    const [albumImage, setAlbumImage] = useState<File | null>(null);
    const [isPremium, setIsPremium] = useState(false);
    const [songs, setSongs] = useState<SongEntry[]>([{ title: "", duration: null, imageFile: null }]);
    const [audioFiles, setAudioFiles] = useState<(File | null)[]>([null]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0) ;
    const audioInputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const imageInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const addSong = () => { setSongs([...songs, { title: "", duration: null, imageFile: null }]); setAudioFiles([...audioFiles, null]); };
    const removeSong = (i: number) => { setSongs(songs.filter((_, idx) => idx !== i)); setAudioFiles(audioFiles.filter((_, idx) => idx !== i)); };
    const updateSong = (i: number, field: keyof SongEntry, value: string | number | File | null) => { const updated = [...songs]; updated[i] = { ...updated[i], [field]: value as any }; setSongs(updated); };

    const handleAudioChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        
        // Check if file size exceeds 10MB
        if (file && file.size > 10 * 1024 * 1024) {
            toast.error("Audio file is too large. Please select a file smaller than 10MB.");
            const newAudioFiles = [...audioFiles];
            newAudioFiles[i] = null;
            setAudioFiles(newAudioFiles);
            if (audioInputRefs.current[i]) audioInputRefs.current[i].value = "";
            return;
        }
        
        const newAudioFiles = [...audioFiles];
        newAudioFiles[i] = file;
        setAudioFiles(newAudioFiles);
        if (file) {
            const fileName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").trim();
            const currentTitle = songs[i].title;
            updateSong(i, "title", currentTitle || fileName);
            const audio = new Audio();
            audio.src = URL.createObjectURL(file);
            audio.onloadedmetadata = () => {
                updateSong(i, "duration", Math.round(audio.duration));
                URL.revokeObjectURL(audio.src);
            };
        } else {
            updateSong(i, "duration", null);
        }
    };

    const handleUploadBatch = async () => {
        if (!albumImage) return toast.error("Please select an album cover");
        const validSongs = songs.filter((s, i) => s.title && audioFiles[i] && s.duration);
        if (validSongs.length === 0) return toast.error("Please add at least one song with title, audio, and wait for duration");
        setIsUploading(true);
        setUploadProgress(0);
        try {
            const data = new FormData();
            data.append("title", albumTitle);
            data.append("artist", albumArtist);
            data.append("genre", albumGenre);
            data.append("releaseYear", albumYear);
            data.append("imageFile", albumImage);
            data.append("isPremium", isPremium.toString());
            
            const songsPayload = songs
                .map((s, i) => ({ ...s, originalIndex: i }))
                .filter(s => s.title && audioFiles[s.originalIndex] && s.duration)
                .map((s) => ({ 
                    title: s.title, 
                    duration: s.duration, 
                    index: s.originalIndex,
                    hasImage: !!s.imageFile 
                }));
            
            data.append("songs", JSON.stringify(songsPayload));
            
            songsPayload.forEach(s => {
                 if (audioFiles[s.index]) {
                     data.append(`audio_${s.index}`, audioFiles[s.index] as Blob);
                 }
                  if (songs[s.index].imageFile) {
                      data.append(`songImage_${s.index}`, songs[s.index].imageFile as Blob);
                  }
            });
            
            await axiosInstance.post("/admin/albums/with-songs", data, {
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                    setUploadProgress(percentCompleted);
                }
            });
            
            toast.success("Album with songs uploaded!");
            console.log("🔄 Refreshing songs and home data after album upload...");
            await fetchSongs(true);
            await fetchAllHomeData();
            console.log("✅ Data refresh complete!");
            
            setAlbumTitle(""); 
            setAlbumArtist(""); 
            setAlbumYear(""); 
            setAlbumImage(null); 
            setSongs([{ title: "", duration: null, imageFile: null }]); 
            setAudioFiles([null]);
            setUploadProgress(0);
            audioInputRefs.current.forEach(ref => { if (ref) ref.value = ""; });
            imageInputRefs.current.forEach(ref => { if (ref) ref.value = ""; });
            if (imageInputRef.current) imageInputRef.current.value = "";
        } catch (error: any) { toast.error(error.response?.data?.message || "Upload failed"); setUploadProgress(0); } finally { setIsUploading(false); }
    };
    const imageInputRef = useRef<HTMLInputElement>(null);

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">Upload Album</h1>
            <div className="card bg-base-100 shadow-xl rounded-lg p-6 max-w-3xl space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-base-content/70 mb-4.5 block">Album Title *</label>
                    <Input required value={albumTitle} onChange={(e) => setAlbumTitle(e.target.value)} placeholder="Album title" className="bg-base-200 border border-white/10 focus:border-emerald-500 text-base-content placeholder:text-base-content/40 h-12" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-base-content/70 mb-4.5 block">Artist *</label>
                        <Input required value={albumArtist} onChange={(e) => setAlbumArtist(e.target.value)} placeholder="Artist name" className="bg-base-200 border border-white/10 focus:border-emerald-500 text-base-content placeholder:text-base-content/40 h-12" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-base-content/70 mb-4.5 block">Genre</label>
                        <Select value={albumGenre} onValueChange={setAlbumGenre}>
                            <SelectTrigger className="bg-base-200 border border-white/10 focus:border-emerald-500 text-base-content h-12 w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>{GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-base-content/70 mb-1.5 block">Album Cover Image *</label>
                    <Input ref={imageInputRef} type="file" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        
                        // Check if file size exceeds 10MB
                        if (file && file.size > 10 * 1024 * 1024) {
                            toast.error("Album cover image is too large. Please select a file smaller than 10MB.");
                            setAlbumImage(null);
                            if (imageInputRef.current) imageInputRef.current.value = "";
                            return;
                        }
                        
                        setAlbumImage(e.target.files?.[0] || null);
                    }} className="bg-base-200 border border-white/10 focus:border-emerald-500 text-base-content file:text-emerald-400 h-12 pt-2" />
                    {albumImage && <p className="text-xs text-emerald-400">Selected: {albumImage.name}</p>}
                </div>
                <div className="flex items-center justify-between p-4 bg-base-200/50 rounded-lg border border-emerald-500/20">
                    <div className="flex items-center gap-3">
                        <Crown className="size-5 text-amber-400" />
                        <div>
                            <p className="font-medium text-sm">Pro Album</p>
                            <p className="text-xs text-base-content/60">Only Pro users can access this album</p>
                        </div>
                    </div>
                    <Switch checked={isPremium} onCheckedChange={setIsPremium} />
                </div>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium text-base-content/70">Songs</h3>
                        <Button size="sm" onClick={addSong} variant="outline" className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10"><Plus className="size-3 mr-1" /> Add Song</Button>
                    </div>
                    {songs.map((song, i) => (
                        <div key={i} className="space-y-3 p-4 bg-base-200 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-emerald-400 w-8">#{i + 1}</span>
                                    <Input value={song.title} onChange={(e) => updateSong(i, "title", e.target.value)} placeholder="Song title" className="bg-base-200 border border-white/10 focus:border-emerald-500 text-base-content placeholder:text-base-content/40 flex-1 min-w-[200px] h-10" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded w-14 text-center">{song.duration ? `${Math.floor(song.duration / 60)}:${String(song.duration % 60).padStart(2, "0")}` : "--:--"}</span>
                                    {songs.length > 1 && <button onClick={() => removeSong(i)} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="size-4" /></button>}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-base-content/60">🎵 Audio File *</label>
                                    <Input 
                                        ref={(el) => { audioInputRefs.current[i] = el; }} 
                                        type="file" 
                                        accept="audio/*" 
                                        onChange={(e) => handleAudioChange(i, e)} 
                                        className="bg-base-200 border border-white/10 focus:border-emerald-500 text-base-content file:text-emerald-400 text-xs h-10" 
                                    />
                                    {audioFiles[i] && <p className="text-xs text-emerald-400 truncate">{audioFiles[i].name}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-base-content/60">🖼️ Song Image (optional)</label>
                                    <Input 
                                        ref={(el) => { imageInputRefs.current[i] = el; }} 
                                        type="file" 
                                        accept="image/*" 
                                        onChange={(e) => updateSong(i, "imageFile", e.target.files?.[0] || null)} 
                                        className="bg-base-200 border border-white/10 focus:border-emerald-500 text-base-content file:text-emerald-400 text-xs h-10" 
                                    />
                                    {song.imageFile && <p className="text-xs text-emerald-400 truncate">{song.imageFile.name}</p>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <Button onClick={handleUploadBatch} disabled={isUploading} className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold w-full h-12">{isUploading ? <Loader2 className="size-4 animate-spin mr-2" /> : <Upload className="size-4 mr-2" />}{isUploading ? "Uploading..." : `Upload Album with ${songs.length} Songs`}</Button>
            </div>
        </div>
    );
};

export default AdminUploadAlbum;
