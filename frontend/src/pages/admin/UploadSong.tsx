import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Switch } from "../../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Upload, Loader2, Plus, X, Crown, Music } from "lucide-react";
import { useMusicStore } from "../../stores/useMusicStore";
import { axiosInstance } from "../../lib/axios";
import toast from "react-hot-toast";
import { GENRES } from "../../lib/utils";

const AdminUploadSong = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ title: "", artist: "", genre: "Other", isPremium: false });
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [duration, setDuration] = useState<number | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const { fetchSongs, fetchAllHomeData } = useMusicStore();
    const audioInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isUploading) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isUploading]);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        
        // Check if file size exceeds 10MB
        if (file && file.size > 10 * 1024 * 1024) {
            toast.error("Audio file is too large. Please select a file smaller than 10MB.");
            setAudioFile(null);
            if (audioInputRef.current) audioInputRef.current.value = "";
            return;
        }
        
        setAudioFile(file);
        if (file) {
            const fileName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").trim();
            setFormData(prev => ({
                ...prev,
                title: prev.title || fileName
            }));
            
            const audio = new Audio();
            audio.src = URL.createObjectURL(file);
            audio.onloadedmetadata = () => {
                setDuration(Math.round(audio.duration));
                URL.revokeObjectURL(audio.src);
            };
        } else {
            setDuration(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!audioFile || !imageFile) return toast.error("Please select both audio and image files");
        setIsUploading(true);
        setUploadProgress(0);
        try {
            const data = new FormData();
            data.append("title", formData.title); 
            data.append("artist", formData.artist); 
            data.append("genre", formData.genre);
            data.append("duration", duration ? String(duration) : "0");
            data.append("isPremium", String(formData.isPremium));
            data.append("audioFile", audioFile); 
            data.append("imageFile", imageFile);
            
            console.log("📤 Uploading song:", { 
              title: formData.title, 
              artist: formData.artist,
              duration,
              fileSize: audioFile.size
            });
            
            const uploadResponse = await axiosInstance.post("/admin/songs", data, {
                headers: { "Content-Type": "multipart/form-data" },
                timeout: 180000, // 3 minutes timeout for large files
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                    setUploadProgress(percentCompleted);
                }
            });
            
            console.log("✅ Upload response received:", uploadResponse.data);
            
            toast.success("Song uploaded successfully!");
            await fetchSongs(true);
            navigate("/admin/songs");
            console.log("✅ Data refresh complete!");
            
            setFormData({ title: "", artist: "", genre: "Other", isPremium: false });
            setAudioFile(null); 
            setImageFile(null); 
            setDuration(null);
            setUploadProgress(0);
            if (audioInputRef.current) audioInputRef.current.value = "";
            if (imageInputRef.current) imageInputRef.current.value = "";
        } catch (error: any) { 
            console.error("Upload error:", error);
            // Show detailed error for debugging
            const errorMessage = error.response?.data?.message 
                || error.response?.data?.error 
                || error.message 
                || "Upload failed - please check file formats and try again";
            toast.error(errorMessage);
            setUploadProgress(0);
        } finally { setIsUploading(false); }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">Upload Song</h1>
            <form onSubmit={handleSubmit} className="card bg-base-100 shadow-xl rounded-lg p-6 max-w-2xl space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-base-content/70 mb-4.5 block">Title *</label>
                    <Input required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Song title" className="bg-base-200 border border-white/10 focus:border-emerald-500 text-base-content placeholder:text-base-content/40 h-12" />
                </div>
                <div className="space-y-2"> 
                    <label className="text-sm font-medium text-base-content/70 mb-4.5 block">Artist *</label>
                    <Input required value={formData.artist} onChange={(e) => setFormData({ ...formData, artist: e.target.value })} placeholder="Artist name" className="bg-base-200 border border-white/10 focus:border-emerald-500 text-base-content placeholder:text-base-content/40 h-12" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-base-content/70 mb-4.5 block">Genre</label>
                        <Select value={formData.genre} onValueChange={(v) => setFormData({ ...formData, genre: v })}>
                            <SelectTrigger className="bg-base-200 border border-white/10 focus:border-emerald-500 text-base-content h-12 w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>{GENRES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-base-content/70 mb-4.5 block">Duration (seconds)</label>
                        <Input type="text" value={duration ? `${duration}s` : "Auto-detect"} disabled className="bg-base-200/50 border border-white/10 text-base-content h-12" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-base-content/70 mb-4.5 block">Audio File *</label>
                        <Input ref={audioInputRef} type="file" accept="audio/*" onChange={handleAudioChange} className="bg-base-200 border border-white/10 focus:border-emerald-500 text-base-content file:text-emerald-400 h-12 pt-2" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-base-content/70 mb-4.5 block">Cover Image *</label>
                        <Input ref={imageInputRef} type="file" accept="image/*" onChange={(e) => {
            const file = e.target.files?.[0] || null;
            
            // Check if file size exceeds 10MB
            if (file && file.size > 10 * 1024 * 1024) {
                toast.error("Image file is too large. Please select a file smaller than 10MB.");
                setImageFile(null);
                if (imageInputRef.current) imageInputRef.current.value = "";
                return;
            }
            
            setImageFile(file);
        }} className="bg-base-200 border border-white/10 focus:border-emerald-500 text-base-content file:text-emerald-400 h-12 pt-2" />
                    </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-base-200/50 rounded-lg border border-amber-500/20">
                    <div className="flex items-center gap-3">
                        <Crown className="size-5 text-amber-400" />
                        <div>
                            <p className="font-medium text-sm">Pro Only</p>
                            <p className="text-xs text-base-content/60">Only Pro users can access this song</p>
                        </div>
                    </div>
                    <Switch checked={formData.isPremium} onCheckedChange={(v) => setFormData({ ...formData, isPremium: v })} />
                </div>
                {isUploading && uploadProgress > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-base-content/70">Uploading...</span>
                            <span className="text-emerald-400 font-medium">{uploadProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-base-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                )}
                <Button type="submit" disabled={isUploading} className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold w-full h-12">{isUploading ? <Loader2 className="size-4 animate-spin mr-2" /> : <Upload className="size-4 mr-2" />}{isUploading ? "Uploading..." : "Upload Song"}</Button>
            </form>
        </div>
    );
};

export default AdminUploadSong;
