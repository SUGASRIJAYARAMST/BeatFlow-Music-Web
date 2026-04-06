import { useEffect, useState } from "react";
import { useAnnouncementStore } from "../../stores/useAnnouncementStore";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Plus, Trash2, Megaphone, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const ANNOUNCEMENT_TYPES = [
    { value: "info", label: "Info", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    { value: "update", label: "Update", color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
    { value: "maintenance", label: "Maintenance", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
    { value: "promotion", label: "Promotion", color: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
    { value: "offer", label: "Offer", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
];

const AdminAnnouncements = () => {
    const { announcements, fetchAnnouncements, createAnnouncement, deleteAnnouncement } = useAnnouncementStore();
    const [showCreate, setShowCreate] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [form, setForm] = useState({ title: "", content: "", type: "info" });
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

    const handleCreate = async () => {
        if (!form.title || !form.content) return toast.error("Title and content are required");
        setIsCreating(true);
        try {
            await createAnnouncement(form);
            toast.success("Announcement created!");
            setShowCreate(false);
            setForm({ title: "", content: "", type: "info" });
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to create announcement");
        } finally {
            setIsCreating(false);
        }
    };

    const getTypeColor = (type: string) => ANNOUNCEMENT_TYPES.find(t => t.value === type)?.color || ANNOUNCEMENT_TYPES[0].color;

    const handleDelete = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            await deleteAnnouncement(deleteId);
            toast.success("Announcement deleted!");
            setDeleteId(null);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete announcement");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Announcements</h1>
                <Button onClick={() => setShowCreate(true)} className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
                    <Plus className="size-4 mr-1" /> New Announcement
                </Button>
            </div>

            {announcements.length === 0 ? (
                <div className="text-center py-20 bg-base-100 shadow-xl rounded-lg border border-white/10">
                    <Megaphone className="size-16 mx-auto text-base-content/60 mb-4" />
                    <p className="text-base-content/60">No announcements yet</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {announcements.map((a) => (
                         <div key={a._id} className="card bg-base-100 shadow-xl rounded-lg p-6 border border-white/10 flex items-start">
                             <div className="flex-1">
                                 <div className="flex items-center gap-3 mb-2">
                                     <h3 className="font-semibold">{a.title}</h3>
                                     <span className={`text-xs px-2 py-0.5 rounded-full border ${getTypeColor(a.type)}`}>{a.type}</span>
                                     {!a.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-base-200 text-base-content/60">Inactive</span>}
                                 </div>
                                 <p className="text-base-content/60 text-sm">{a.content}</p>
                                 <p className="text-xs text-base-content/60 mt-2">{new Date(a.createdAt).toLocaleDateString()}</p>
                             </div>
                             <Button variant="ghost" size="icon" onClick={() => setDeleteId(a._id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 ms-auto">
                                 <Trash2 className="size-4" />
                             </Button>
                         </div>
                    ))}
                </div>
            )}

            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="bg-base-100 shadow-xl text-white max-w-xl border border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">New Announcement</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 mt-2 pb-2">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-base-content/70 mb-4.5 block">Title *</label>
                            <Input 
                                value={form.title} 
                                onChange={(e) => setForm({ ...form, title: e.target.value })} 
                                placeholder="Announcement title" 
                                className="bg-base-200 border border-white/10 focus:border-emerald-500 text-base-content placeholder:text-base-content/40 h-12" 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-base-content/70 mb-4.5 block">Content *</label>
                            <Textarea 
                                value={form.content} 
                                onChange={(e) => setForm({ ...form, content: e.target.value })} 
                                placeholder="Announcement content" 
                                className="bg-base-200 border border-white/10 focus:border-emerald-500 text-base-content placeholder:text-base-content/40 min-h-[120px]" 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-base-content/70 mb-4.5 block">Type</label>
                            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                                <SelectTrigger className="bg-base-200 border border-white/10 focus:border-emerald-500 text-base-content h-12 w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ANNOUNCEMENT_TYPES.map((t) => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={handleCreate} disabled={isCreating} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-12">
                            {isCreating ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                            {isCreating ? "Creating..." : "Create Announcement"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <DialogContent className="bg-base-100 shadow-xl text-white max-w-md border border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Delete Announcement</DialogTitle>
                    </DialogHeader>
                    <p className="text-base-content/70 mt-2">Are you sure you want to delete this announcement? This action cannot be undone.</p>
                    <div className="flex gap-3 mt-6">
                        <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1 border-white/10 text-base-content hover:bg-base-200">
                            Cancel
                        </Button>
                        <Button onClick={handleDelete} disabled={isDeleting} className="flex-1 bg-red-500 hover:bg-red-400 text-white">
                            {isDeleting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                            {isDeleting ? "Deleting..." : "Delete"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminAnnouncements;
