import { useState } from "react";
import { useUser, useClerk } from "@clerk/react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { ExternalLink, Database, Users, Image, Key, Shield, Loader2, LogOut, Pencil, Check, X, Camera } from "lucide-react";
import toast from "react-hot-toast";
import { useMusicStore } from "../../stores/useMusicStore";
import { useAuthStore } from "../../stores/useAuthStore";
import { axiosInstance } from "../../lib/axios";

const AdminSettings = () => {
    const { user } = useUser();
    const clerk = useClerk();
    const navigate = useNavigate();
    const { fetchUserProfile } = useAuthStore() ;
    const [clearingCache, setClearingCache] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [newName, setNewName] = useState(user?.fullName || "");
    const [savingName, setSavingName] = useState(false);
    const [showClearCacheDialog, setShowClearCacheDialog] = useState(false);
    const { fetchSongs, fetchAlbums, fetchStats } = useMusicStore();

    const handleSaveName = async () => {
        if (!newName.trim()) {
            toast.error("Name cannot be empty");
            return;
        }
        try {
            setSavingName(true);
            const res = await axiosInstance.put("/users/settings", { fullName: newName.trim() });
            console.log("Name update response:", res.data);
            toast.success("Name updated successfully");
            setEditingName(false);
            window.location.reload();
        } catch (error: any) {
            console.error("Name update error:", error.response?.data || error.message);
            toast.error(error.response?.data?.message || error.message || "Failed to update name");
        } finally {
            setSavingName(false);
        }
    };

    const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }
        if (file.size > 8 * 1024 * 1024) {
            toast.error("Image must be less than 8MB");
            return;
        }
        try {
            setSavingName(true);
            toast.loading("Uploading profile picture...");
            await user?.setProfileImage({ file });
            await user?.reload();
            const newImageUrl = user?.imageUrl;
            if (newImageUrl) {
                await axiosInstance.put("/users/settings", { imageUrl: newImageUrl });
            }
            toast.dismiss();
            toast.success("Profile picture updated!");
            window.location.reload();
        } catch (error: any) {
            toast.dismiss();
            toast.error(error.message || "Failed to update profile picture");
        } finally {
            setSavingName(false);
        }
    };

    const handleSignOut = async () => {
        await clerk.signOut();
        navigate("/");
    };

    const handleClearCache = async () => {
        setShowClearCacheDialog(false);
        try {
            setClearingCache(true);
            await fetchSongs();
            await fetchAlbums();
            await fetchStats();
            toast.success("Cache cleared and data refreshed!");
        } catch (error) {
            toast.error("Failed to clear cache");
        } finally {
            setClearingCache(false);
        }
    };

    return (
        <div>
            <h1 className='text-2xl font-bold mb-6'>Admin Settings</h1>

            <div className='space-y-6 max-w-2xl'>
                <div className='card bg-base-200 rounded-lg p-6 border border-base-100'>
                    <h2 className='text-lg font-semibold mb-4 flex items-center gap-2'>
                        <Key className='size-5' /> Service Links
                    </h2>
                    <div className='space-y-3'>
                        <a href='https://account.mongodb.com/account/login' target='_blank' rel='noopener noreferrer' className='flex items-center justify-between p-4 bg-base-100 rounded-lg hover:bg-base-100/80 transition-colors group'>
                            <div className='flex items-center gap-3'>
                                <Database className='size-5 text-emerald-400' />
                                <div>
                                    <p className='font-medium'>MongoDB Atlas</p>
                                    <p className='text-xs text-base-content/60'>Database Management</p>
                                </div>
                            </div>
                            <ExternalLink className='size-4 text-base-content/40 group-hover:text-base-content transition-colors' />
                        </a>
                        <a href='https://dashboard.clerk.com' target='_blank' rel='noopener noreferrer' className='flex items-center justify-between p-4 bg-base-100 rounded-lg hover:bg-base-100/80 transition-colors group'>
                            <div className='flex items-center gap-3'>
                                <Users className='size-5 text-blue-400' />
                                <div>
                                    <p className='font-medium'>Clerk Dashboard</p>
                                    <p className='text-xs text-base-content/60'>User Authentication</p>
                                </div>
                            </div>
                            <ExternalLink className='size-4 text-base-content/40 group-hover:text-base-content transition-colors' />
                        </a>
                        <a href='https://cloudinary.com/users/login' target='_blank' rel='noopener noreferrer' className='flex items-center justify-between p-4 bg-base-100 rounded-lg hover:bg-base-100/80 transition-colors group'>
                            <div className='flex items-center gap-3'>
                                <Image className='size-5 text-purple-400' />
                                <div>
                                    <p className='font-medium'>Cloudinary</p>
                                    <p className='text-xs text-base-content/60'>Media Storage</p>
                                </div>
                            </div>
                            <ExternalLink className='size-4 text-base-content/40 group-hover:text-base-content transition-colors' />
                        </a>
                    </div>
                </div>

                <div className='card bg-base-200 rounded-lg p-6 border border-base-100'>
                    <h2 className='text-lg font-semibold mb-4 flex items-center gap-2'>
                        <Shield className='size-5' /> Admin Account
                    </h2>
                    <div className='flex items-center gap-4'>
                        <div className='relative group'>
                            {user?.imageUrl ? (
                                <img src={user.imageUrl} alt={user.fullName || ""} className='size-12 rounded-full' />
                            ) : (
                                <div className='size-12 bg-base-300 rounded-full flex items-center justify-center'>
                                    <Shield className='size-6 text-base-content/60' />
                                </div>
                            )}
                            <label className='absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer'>
                                <Camera className='size-4 text-white' />
                                <input type='file' accept='image/*' onChange={handleProfileImageChange} className='hidden' disabled={savingName} />
                            </label>
                        </div>
                        <div className='flex-1'>
                            {editingName ? (
                                <div className='flex items-center gap-2'>
                                    <Input
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className='bg-base-300 border-base-100 h-8 text-sm'
                                        autoFocus
                                        onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                                    />
                                    <button onClick={handleSaveName} disabled={savingName} className='p-1.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg transition-colors'>
                                        <Check className='size-4' />
                                    </button>
                                    <button onClick={() => { setEditingName(false); setNewName(user?.fullName || ""); }} className='p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors'>
                                        <X className='size-4' />
                                    </button>
                                </div>
                            ) : (
                                <div className='flex items-center gap-2'>
                                    <p className='font-medium'>{user?.fullName}</p>
                                    <button onClick={() => { setEditingName(true); setNewName(user?.fullName || ""); }} className='p-1 hover:bg-white/10 rounded-lg transition-colors'>
                                        <Pencil className='size-3.5 text-base-content/40 hover:text-base-content' />
                                    </button>
                                </div>
                            )}
                            <p className='text-sm text-base-content/60'>{user?.primaryEmailAddress?.emailAddress}</p>
                        </div>
                    </div>
                </div>

                <div className='bg-red-500/5 rounded-lg p-6 border border-red-500/20'>
                    <h2 className='text-lg font-semibold mb-4 flex items-center gap-2 text-red-400'>
                        <Shield className='size-5' /> Maintenance
                    </h2>
                    <p className='text-sm text-base-content/60 mb-4'>Refresh your application data.</p>
                    <div className='flex gap-3'>
                        <Button
                            variant='outline'
                            className='text-red-400 border-red-400/20 hover:bg-red-500/10'
                            onClick={() => setShowClearCacheDialog(true)}
                            disabled={clearingCache}
                        >
                            {clearingCache ? <Loader2 className='size-4 mr-2 animate-spin' /> : null}
                            Refresh All Data
                        </Button>
                    </div>
                </div>

                <Dialog open={showClearCacheDialog} onOpenChange={setShowClearCacheDialog}>
                    <DialogContent className="bg-neutral-900 border border-neutral-700 text-white max-w-sm">
                        <DialogHeader className="text-left space-y-2">
                            <DialogTitle className="text-xl font-bold text-white">Clear Cache?</DialogTitle>
                            <DialogDescription className="text-neutral-300 text-base">
                                Are you sure you want to clear all cached data? This will not delete any songs or users.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex gap-3 pt-4">
                            <Button 
                                variant="outline" 
                                className="flex-1 border-neutral-600 text-neutral-200 hover:bg-neutral-800 hover:text-white" 
                                onClick={() => setShowClearCacheDialog(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 bg-red-600 border-red-600 text-white hover:bg-red-700"
                                onClick={handleClearCache}
                                disabled={clearingCache}
                            >
                                {clearingCache ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
                                Clear Cache
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <button
                    onClick={handleSignOut}
                    className='w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2'
                >
<LogOut className='size-4' /> Sign Out
                </button>
            </div>
        </div>
    );
};

export default AdminSettings;
