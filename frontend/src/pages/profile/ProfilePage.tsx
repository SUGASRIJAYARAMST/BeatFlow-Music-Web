import { useEffect, useState, useCallback, useRef } from "react";
import { useAuthStore } from "../../stores/useAuthStore";
import { useSubscriptionStore } from "../../stores/useSubscriptionStore";
import { useMusicStore } from "../../stores/useMusicStore";
import { usePlaylistStore } from "../../stores/usePlaylistStore";
import { useLanguageStore } from "../../stores/useLanguageStore";
import { useNotificationStore } from "../../stores/useNotificationStore";
import Topbar from "../../components/layout/Topbar";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Switch } from "../../components/ui/switch";
import { Button } from "../../components/ui/button";
import { User, Bell, CreditCard, LogOut, Clock, Heart, ListMusic, Crown, Calendar, Timer, Languages, RotateCcw, Pencil, ExternalLink, Key, ChevronRight, Eye, EyeOff, CheckCircle, XCircle, Hourglass, Camera, Crop, X, Upload, KeyRound, ShieldCheck, Loader2, Headphones, Copy, Mail, Star, Send, MessageSquare } from "lucide-react";
import { useUser, useClerk } from "@clerk/react";
import { useNavigate } from "react-router-dom";
import { axiosInstance } from "../../lib/axios";
import { cn } from "../../lib/utils";
import toast from "react-hot-toast";
import debounce from "lodash/debounce";

interface PasswordRequest {
    _id: string;
    status: "pending" | "approved" | "rejected";
    createdAt: string;
    approvedAt: string | null;
    expiresAt: string | null ;
}

const getRemainingTime = (expiryTimestamp: number) => {
    const now = Date.now();
    const diff = expiryTimestamp - now;
    if (diff <= 0) return "Expired";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};

const ProfilePage = () => {
    const { user: authUser, fetchUserProfile } = useAuthStore();
    const isPremium = useSubscriptionStore((state) => state.isPremium);
    const subscriptionPlan = useSubscriptionStore((state) => state.subscriptionPlan);
    const subscriptionExpiry = useSubscriptionStore((state) => state.subscriptionExpiry);
    const expiryTimestamp = useSubscriptionStore((state) => state.expiryTimestamp);
    const checkSubscription = useSubscriptionStore((state) => state.checkSubscription);
    const { likedSongs, fetchLikedSongs } = useMusicStore();
    const { playlists, fetchPlaylists } = usePlaylistStore();
    const { language, setLanguage, t } = useLanguageStore();
    const notificationStore = useNotificationStore();
    const { user } = useUser();
    const clerk = useClerk();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState(true);
    const [saving, setSaving] = useState(false);
    const [remainingTime, setRemainingTime] = useState("");
    const [passwordRequests, setPasswordRequests] = useState<PasswordRequest[]>([]);
    const [pinResetRequests, setPinResetRequests] = useState<PasswordRequest[]>([]);
    const [activeStat, setActiveStat] = useState(0);
    const [editedName, setEditedName] = useState("");
    const [isEditingName, setIsEditingName] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [currentPassError, setCurrentPassError] = useState(false);
    const [showCropModal, setShowCropModal] = useState(false);
    const [cropImage, setCropImage] = useState<string | null>(null);
    const [showImageOptions, setShowImageOptions] = useState(false);
    const [viewImage, setViewImage] = useState(false);
    const [showLangDropdown, setShowLangDropdown] = useState(false);
    const [showForgotPin, setShowForgotPin] = useState(false);
    const [showForgotPinDigits, setShowForgotPinDigits] = useState(false);
    const [forgotPinStep, setForgotPinStep] = useState<"pin" | "verify">("pin");
    const [forgotPinNewPin, setForgotPinNewPin] = useState("");
    const [forgotPinPass, setForgotPinPass] = useState("");
    const [forgotPinAttempts, setForgotPinAttempts] = useState(() => {
        const saved = localStorage.getItem("forgotPinAttempts");
        return saved ? parseInt(saved) : 0;
    });
    const [showForgotPass, setShowForgotPass] = useState(false);
    const [submittingPinRequest, setSubmittingPinRequest] = useState(false);
    const [forgotPinKeys, setForgotPinKeys] = useState<string[]>([]);
    const [lockedTimeRemaining, setLockedTimeRemaining] = useState<string | null>(null);
    const [feedbackRating, setFeedbackRating] = useState(5);
    const [feedbackText, setFeedbackText] = useState("");
    const [submittingFeedback, setSubmittingFeedback] = useState(false);
    const [userFeedbacks, setUserFeedbacks] = useState<any[]>([]);
    const [showFeedbackCard, setShowFeedbackCard] = useState(false);
    const imageOptionsRef = useRef<HTMLDivElement>(null);
    const langDropdownRef = useRef<HTMLDivElement>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (imageOptionsRef.current && !imageOptionsRef.current.contains(e.target as Node)) {
                setShowImageOptions(false);
            }
            if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
                setShowLangDropdown(false);
            }
        };
        
        if (showImageOptions || showLangDropdown) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [showImageOptions, showLangDropdown]);

    useEffect(() => {
        if (isEditingName) {
            setEditedName(authUser?.fullName || user?.fullName || "");
        }
    }, [isEditingName, authUser?.fullName, user?.fullName]);

    useEffect(() => {
        intervalRef.current = setInterval(() => {
            setActiveStat((prev) => (prev + 1) % 3);
        }, 2000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    useEffect(() => {
        Promise.all([
            fetchUserProfile(),
            checkSubscription(),
            fetchLikedSongs(),
            fetchPlaylists(),
            axiosInstance.get("/users/password-change-requests").then(r => r.data),
            axiosInstance.get("/pin-reset").then(r => r.data)
        ]).then(([_, __, ___, ____, pwRequests, pinRequests]) => {
            setPasswordRequests(pwRequests || []);
            setPinResetRequests(pinRequests || []);
        }).catch(() => {});
    }, []);

    useEffect(() => {
        const checkAndStartTimer = () => {
            let lockedAt = localStorage.getItem("forgotPinLockedAt");
            const attempts = parseInt(localStorage.getItem("forgotPinAttempts") || "0");
            console.log("Profile timer - attempts:", attempts, "lockedAt:", lockedAt);
            
            if (attempts >= 3 && !lockedAt) {
                localStorage.setItem("forgotPinLockedAt", Date.now().toString());
                lockedAt = localStorage.getItem("forgotPinLockedAt");
            }
            
            if (attempts < 3 || !lockedAt) {
                console.log("No timer needed - attempts:", attempts);
                return;
            }
            
            const updateTimer = () => {
                const lockedTime = parseInt(lockedAt);
                const now = Date.now();
                const lockDuration = 2 * 60 * 60 * 1000; // 2 hr
                const remaining = lockDuration - (now - lockedTime);
                
                console.log("Profile remaining:", remaining);
                
                if (remaining <= 0) {
                    localStorage.setItem("forgotPinAttempts", "0");
                    localStorage.removeItem("forgotPinLockedAt");
                    setForgotPinAttempts(0);
                    setLockedTimeRemaining(null);
                    return false;
                }
                
                const secs = Math.floor(remaining / 1000);
                const mins = Math.floor(secs / 60);
                const hours = Math.floor(mins / 60);
                let timeStr;
                if (hours > 0) {
                    timeStr = `${hours}h ${mins % 60}m`;
                } else if (mins > 0) {
                    timeStr = `${mins}m ${secs % 60}s`;
                } else {
                    timeStr = `${secs}s`;
                }
                console.log("Setting lockedTimeRemaining to:", timeStr);
                setLockedTimeRemaining(timeStr);
                return true;
            };
            
            updateTimer();
            const interval = setInterval(() => {
                if (!updateTimer()) clearInterval(interval);
            }, 1000);
            
            return () => clearInterval(interval);
        };
        
        checkAndStartTimer();
    }, []);

    useEffect(() => { 
        if (authUser && !isEditingName) {
            setEditedName(authUser.fullName || user?.fullName || "");
        }
    }, [authUser, user]);

    const handleSaveName = async () => {
        if (!editedName.trim()) return;
        try {
            setSaving(true);
            const res = await axiosInstance.put("/users/settings", { fullName: editedName.trim() });
            toast.success("Name updated successfully");
            await fetchUserProfile();
            setIsEditingName(false);
            window.location.reload();
        } catch (error: any) {
            console.error("Update name error:", error);
            const msg = error.response?.data?.message || error.message || "Failed to update name";
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleSubmitFeedback = async () => {
        if (!feedbackText.trim()) {
            toast.error("Please enter your feedback");
            return;
        }
        setSubmittingFeedback(true);
        try {
            await axiosInstance.post("/feedback", { rating: feedbackRating, feedback: feedbackText.trim() });
            toast.success("Feedback submitted!");
            setFeedbackText("");
            setFeedbackRating(5);
            const res = await axiosInstance.get("/feedback/my-feedback");
            setUserFeedbacks(res.data);
            setShowFeedbackCard(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to submit feedback");
        } finally {
            setSubmittingFeedback(false);
        }
    };

    useEffect(() => {
        const fetchFeedback = async () => {
            try {
                const res = await axiosInstance.get("/feedback/my-feedback");
                setUserFeedbacks(res.data);
            } catch (error) {}
        };
        fetchFeedback();
    }, []);

    const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setShowImageOptions(false);
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

        const img = new Image();
        const reader = new FileReader();
        reader.onload = () => {
            img.src = reader.result as string;
        };
        img.onload = () => {
            if (img.width < 300 || img.height < 300) {
                toast.error("Image must be at least 300x300 pixels");
                return;
            }
            setCropImage(reader.result as string);
            setShowCropModal(true);
        };
        reader.readAsDataURL(file);
    };

    const handleCropComplete = async (croppedCanvas: HTMLCanvasElement) => {
        try {
            setSaving(true);
            croppedCanvas.toBlob(async (blob) => {
                if (!blob) return;
                const file = new File([blob], "profile.jpg", { type: "image/jpeg" });

                // Add loading spinner feedback
                toast.loading("Uploading profile picture...");

                await user?.setProfileImage({ file });
                toast.dismiss();
                toast.success("Profile picture updated!");
                setShowCropModal(false);
                setCropImage(null);
                await fetchUserProfile();
                window.location.reload();
            }, "image/jpeg", 0.95); // High-quality compression
        } catch (error: any) {
            toast.dismiss();
            toast.error(error.message || "Failed to update profile picture");
        } finally {
            setSaving(false);
        }
    };

    const handleOpenClerkSettings = () => {
        window.open("https://dashboard.clerk.com", "_blank");
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword) {
            toast.error("Please enter both current and new password");
            return;
        }
        if (newPassword.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }
        if (!/[A-Z]/.test(newPassword)) {
            toast.error("Password must contain at least one uppercase letter");
            return;
        }
        if (!/[a-z]/.test(newPassword)) {
            toast.error("Password must contain at least one lowercase letter");
            return;
        }
        if (!/[0-9]/.test(newPassword)) {
            toast.error("Password must contain at least one number");
            return;
        }
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
            toast.error("Password must contain at least one special character");
            return;
        }
        try {
            setSaving(true);
            setCurrentPassError(false);
            await axiosInstance.post("/users/request-password-change", { currentPassword, newPassword });
            toast.success("Password change request sent to admin for approval!");
            setShowPasswordModal(false);
            setCurrentPassword("");
            setNewPassword("");
            setShowPassword(false);
            setShowCurrentPassword(false);
            setCurrentPassError(false);
            setTimeout(() => window.location.reload(), 1000);
        } catch (error: any) {
            const msg = error.response?.data?.message || "Failed to submit password change request";
            toast.error(msg);
            if (msg.toLowerCase().includes("incorrect")) {
                setCurrentPassError(true);
            }
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        if (expiryTimestamp) {
            const update = () => setRemainingTime(getRemainingTime(expiryTimestamp));
            update();
            const interval = setInterval(update, 60000);
            return () => clearInterval(interval);
        }
    }, [expiryTimestamp]);

    const handleSignOut = async () => { await clerk.signOut(); navigate("/"); };

    const handleForgotPinSubmit = async () => {
        if (forgotPinNewPin.length !== 4) {
            toast.error("PIN must be 4 digits");
            return;
        }
        setForgotPinStep("verify");
    };

    const handleForgotPinVerify = async () => {
        if (!forgotPinPass) {
            toast.error("Please enter your password");
            return;
        }
        try {
            setSubmittingPinRequest(true);
            
            await axiosInstance.post("/users/verify-password", { password: forgotPinPass });
            
            await axiosInstance.post("/pin-reset", { newPin: forgotPinNewPin });
            toast.success("PIN reset request sent to admin!");
            setShowForgotPin(false);
            setForgotPinStep("pin");
            setForgotPinNewPin("");
            setForgotPinPass("");
            setForgotPinAttempts(0);
            localStorage.setItem("forgotPinAttempts", "0");
        } catch (error: any) {
            const newAttempts = forgotPinAttempts + 1;
            setForgotPinPass("");
            setForgotPinAttempts(newAttempts);
            localStorage.setItem("forgotPinAttempts", newAttempts.toString());
            if (error.response?.data?.message?.includes("pending")) {
                toast.error("You already have a pending PIN reset request");
                setShowForgotPin(false);
                setForgotPinStep("pin");
                setForgotPinNewPin("");
                setForgotPinPass("");
                return;
            }
            if (newAttempts >= 3) {
                toast.error("Too many failed attempts. You cannot submit more PIN reset requests.");
                localStorage.setItem("forgotPinLockedAt", Date.now().toString());
                setShowForgotPin(false);
                setForgotPinStep("pin");
                setForgotPinNewPin("");
                setForgotPinPass("");
                return;
            }
            if (error.response?.data?.message?.includes("social") || error.response?.data?.message?.includes("password")) {
                toast.error(`${error.response.data.message}. ${3 - newAttempts} attempt(s) remaining.`);
            } else {
                toast.error(error.response?.data?.message || "Verification failed");
            }
        } finally { setSubmittingPinRequest(false); }
    };
    const savePreferences = useCallback(
        debounce(async (newNotifications?: boolean) => {
            try {
                const enabled = newNotifications ?? notifications;
                notificationStore.setEnabled(enabled); // Optimistic UI update
                await axiosInstance.put("/users/settings", { notifications: enabled });
                toast.success("Preferences saved successfully");
            } catch {
                toast.error("Failed to save preferences");
                notificationStore.setEnabled(!newNotifications); // Revert on failure
            }
        }, 300), // Debounce with 300ms delay
        [notifications, notificationStore]
    );

    const PLAN_NAMES: Record<string, string> = {
        daily: "Daily",
        monthly: "Monthly",
        yearly: "Yearly",
        admin: "Admin (Lifetime)",
    };

    const PLAN_PRICES: Record<string, string> = {
        daily: "₹1/day",
        monthly: "₹29/month",
        yearly: "₹99/year",
        admin: "Free (Admin)",
    };

    const isLocked = forgotPinAttempts >= 3 || parseInt(localStorage.getItem("forgotPinAttempts") || "0") >= 3;
    const displayText = lockedTimeRemaining ? `Locked (${lockedTimeRemaining})` : isLocked ? "Locked - Too many attempts" : "Forgot Wallet PIN?";

    return (
        <div className="h-full bg-[#0a0a0a]" onWheel={() => setShowImageOptions(false)}>
            <Topbar />
            <ScrollArea className="h-[calc(100vh-220px)] md:h-[calc(100vh-180px)]">
                <div className="p-4 md:p-6 lg:p-10 max-w-3xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-white tracking-tight mb-1">{t("profile_title")}</h1>
                        <p className="text-gray-400">{t("profile_subtitle")}</p>
                    </div>

                    {viewImage && authUser?.imageUrl && (
                        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4" onClick={() => setViewImage(false)}>
                            <div className="glass-dark rounded-2xl p-4 border border-white/20 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-end mb-2">
                                    <button onClick={() => setViewImage(false)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                                        <X className="size-4 text-white" />
                                    </button>
                                </div>
                                <div className="w-[200px] h-[200px] mx-auto rounded-full overflow-hidden border-4 border-white/20">
                                    <img 
                                        src={authUser.imageUrl} 
                                        alt={authUser.fullName || "Profile"} 
                                        className="w-full h-full object-cover"
                                    />
                </div>
            </div>
        </div>
    )}

    {showForgotPin && (
        <div className='fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50'>
            <div className='bg-[#1a1a1a] rounded-2xl max-w-md w-full mx-4 border border-white/10 shadow-2xl overflow-hidden'>
                {forgotPinStep === "pin" ? (
                    <>
                        <div className='p-6 border-b border-white/10 flex items-center justify-between'>
                            <div className='flex items-center gap-3'>
                                <div className='size-10 bg-amber-500/20 rounded-full flex items-center justify-center'>
                                    <KeyRound className='size-5 text-amber-400' />
                                </div>
                                <div>
                                    <h2 className='text-lg font-bold text-white'>Reset Wallet PIN</h2>
                                    <p className='text-xs text-gray-400'>Choose your new 4-digit PIN</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowForgotPin(false); setForgotPinNewPin(""); setForgotPinKeys([]); }} className='p-2 hover:bg-white/10 rounded-full transition-colors'>
                                <X className='size-5 text-gray-400' />
                            </button>
                        </div>
                        <div className='p-6'>
                            <p className='text-sm text-gray-400 mb-4 text-center'>
                                Select 4 digits for your new wallet PIN
                            </p>
                            <div className='flex justify-center items-center gap-2 mb-4'>
                                <button
                                    onClick={() => setShowForgotPinDigits(!showForgotPinDigits)}
                                    className='flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors'
                                >
                                    {showForgotPinDigits ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                                    {showForgotPinDigits ? "Hide" : "Show"}
                                </button>
                            </div>
                            <div className='text-center mb-6'>
                                <div className='flex justify-center gap-3'>
                                    {[0, 1, 2, 3].map((i) => (
                                        <div
                                            key={i}
                                            onClick={() => document.getElementById('forgot-pin-input')?.focus()}
                                            className='w-12 h-12 bg-[#252525] border border-white/20 rounded-lg flex items-center justify-center text-xl font-bold text-white cursor-pointer'
                                        >
                                            {forgotPinNewPin[i] ? (showForgotPinDigits ? forgotPinNewPin[i] : "•") : ""}
                                        </div>
                                    ))}
                                </div>
                                <input
                                    id="forgot-pin-input"
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={4}
                                    className="absolute opacity-0 pointer-events-none"
                                    value={forgotPinNewPin}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                                        setForgotPinNewPin(val);
                                    }}
                                    autoFocus
                                />
                            </div>
                            <div className='grid grid-cols-3 gap-3 mb-6'>
                                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((key) => (
                                    <button
                                        key={key}
                                        onClick={() => {
                                            if (key === "del") {
                                                setForgotPinNewPin(forgotPinNewPin.slice(0, -1));
                                            } else if (key && forgotPinNewPin.length < 4) {
                                                setForgotPinNewPin(forgotPinNewPin + key);
                                            }
                                        }}
                                        disabled={key === ""}
                                        className={`h-12 rounded-lg font-bold text-lg transition-colors ${
                                            key === "del"
                                                ? "bg-transparent text-gray-400 hover:text-white"
                                                : key === ""
                                                ? "bg-transparent"
                                                : "bg-[#252525] text-white hover:bg-[#333]"
                                        }`}
                                    >
                                        {key === "del" ? "⌫" : key}
                                    </button>
                                ))}
                            </div>
                            <Button
                                onClick={handleForgotPinSubmit}
                                disabled={forgotPinNewPin.length !== 4}
                                className='w-full bg-amber-500 hover:bg-amber-400 text-black font-bold h-12 rounded-xl disabled:opacity-50'
                            >
                                Continue
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className='p-6 border-b border-white/10 flex items-center justify-between'>
                            <div className='flex items-center gap-3'>
                                <div className='size-10 bg-amber-500/20 rounded-full flex items-center justify-center'>
                                    <ShieldCheck className='size-5 text-amber-400' />
                                </div>
                                <div>
                                    <h2 className='text-lg font-bold text-white'>Verify It's You</h2>
                                    <p className='text-xs text-gray-400'>Enter your account password</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowForgotPin(false); setForgotPinStep("pin"); setForgotPinNewPin(""); setForgotPinPass(""); }} className='p-2 hover:bg-white/10 rounded-full transition-colors'>
                                <X className='size-5 text-gray-400' />
                            </button>
                        </div>
                        <div className='p-6'>
                            <p className='text-sm text-gray-400 mb-4'>
                                For security, verify your identity before submitting the PIN reset request.
                            </p>
                            <div className='relative mb-3'>
                                <input
                                    type={showForgotPass ? "text" : "password"}
                                    value={forgotPinPass}
                                    onChange={(e) => setForgotPinPass(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleForgotPinVerify()}
                                    className='w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-gray-500/50'
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowForgotPass(!showForgotPass)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                >
                                    {showForgotPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </button>
                            </div>
                            {forgotPinAttempts > 0 && (
                                <p className='text-xs text-red-400 mb-3'>
                                    {3 - forgotPinAttempts} attempt(s) remaining
                                </p>
                            )}
                            <div className='flex gap-3'>
                                <Button
                                    onClick={() => { setShowForgotPin(false); setForgotPinStep("pin"); setForgotPinNewPin(""); setForgotPinPass(""); }}
                                    variant="ghost"
                                    className='flex-1 text-gray-400 hover:text-white h-12 rounded-xl'
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleForgotPinVerify}
                                    disabled={submittingPinRequest || !forgotPinPass}
                                    className='flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-12 rounded-xl disabled:opacity-50'
                                >
                                    {submittingPinRequest ? <Loader2 className='size-4 animate-spin' /> : "Submit Request"}
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )}

                    <div className="space-y-6">
                        {/* Account Card */}
                        <div className="bg-[#141414] border border-white/10 rounded-2xl p-6">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <User className="size-5 text-emerald-400" /> {t("account")}
                            </h2>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="relative group">
                                    {user?.imageUrl ? (
                                        <img src={user.imageUrl} alt={user.fullName || ""} className="size-16 rounded-full border-2 border-white/10" />
                                    ) : (
                                        <div className="size-16 bg-white/5 rounded-full flex items-center justify-center">
                                            <User className="size-8 text-gray-500" />
                                        </div>
                                    )}
                                    <button
                                        onClick={() => setShowImageOptions(!showImageOptions)}
                                        className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Camera className="size-5 text-white" />
                                    </button>
                                    {showImageOptions && (
                                        <div ref={imageOptionsRef} className="absolute left-0 top-full mt-2 w-40 bg-base-100 rounded-xl shadow-xl border border-white/10 overflow-hidden z-50">
                                            <button
                                        onClick={(e) => { e.stopPropagation(); setShowImageOptions(false); setTimeout(() => setViewImage(true), 100); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left text-sm"
                                    >
                                        <Eye className="size-4 text-emerald-400" />
                                        View Pic
                                    </button>
                                            <label className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left text-sm cursor-pointer">
                                                <Upload className="size-4 text-amber-400" />
                                                Upload Pic
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    onChange={handleProfileImageChange} 
                                                    className="hidden" 
                                                    disabled={saving} 
                                                />
                                            </label>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        {isEditingName ? (
                                            <div className="flex items-center gap-2 flex-1">
                                                <input
                                                    type="text"
                                                    value={editedName}
                                                    onChange={(e) => setEditedName(e.target.value)}
                                                    className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 flex-1"
                                                    autoFocus
                                                    onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                                                />
                                                <button
                                                    onClick={handleSaveName}
                                                    disabled={saving}
                                                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => { setIsEditingName(false); setEditedName(authUser?.fullName || user?.fullName || ""); }}
                                                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold text-sm transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="font-semibold text-lg text-white">{authUser?.fullName}</p>
                                                <button
                                                    onClick={() => { setIsEditingName(true); setEditedName(authUser?.fullName || user?.fullName || ""); }}
                                                    className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                                >
                                                    <Pencil className="size-4 text-gray-400 hover:text-white" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-400">{user?.primaryEmailAddress?.emailAddress || authUser?.clerkId}</p>
                                    {authUser?.role === "admin" && (
                                        <span className="inline-block mt-1 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/20">
                                            Admin
                                        </span>
                                    )}
                            </div>
                        </div>

                        {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-3">
                                <div 
                                    onClick={() => navigate("/liked")}
                                    className={cn(
                                        "rounded-xl p-4 text-center border transition-all duration-500 cursor-pointer select-none",
                                        activeStat === 0 
                                            ? "scale-105 bg-emerald-500/10 border-emerald-500/30" 
                                            : "bg-white/5 border-white/5 hover:bg-white/5/80"
                                    )}
                                >
                                    <Heart className={cn("size-5 mx-auto mb-2 transition-colors", activeStat === 0 ? "text-rose-400" : "text-rose-400/60")} />
                                    <p className={cn("text-2xl font-bold transition-colors", activeStat === 0 ? "text-emerald-400" : "text-white/60")}>{likedSongs.length}</p>
                                    <p className={cn("text-xs transition-colors", activeStat === 0 ? "text-emerald-400/80" : "text-gray-400/60")}>{t("liked_songs")}</p>
                                </div>
                                <div 
                                    onClick={() => navigate("/playlists")}
                                    className={cn(
                                        "rounded-xl p-4 text-center border transition-all duration-500 cursor-pointer select-none",
                                        activeStat === 1 
                                            ? "scale-105 bg-emerald-500/10 border-emerald-500/30" 
                                            : "bg-white/5 border-white/5 hover:bg-white/5/80"
                                    )}
                                >
                                    <ListMusic className={cn("size-5 mx-auto mb-2 transition-colors", activeStat === 1 ? "text-violet-400" : "text-violet-400/60")} />
                                    <p className={cn("text-2xl font-bold transition-colors", activeStat === 1 ? "text-emerald-400" : "text-white/60")}>{playlists.length}</p>
                                    <p className={cn("text-xs transition-colors", activeStat === 1 ? "text-emerald-400/80" : "text-gray-400/60")}>{t("playlists")}</p>
                                </div>
                                <div 
                                    onClick={() => navigate("/premium")}
                                    className={cn(
                                        "rounded-xl p-4 text-center border transition-all duration-500 cursor-pointer select-none",
                                        activeStat === 2 
                                            ? "scale-105 bg-emerald-500/10 border-emerald-500/30" 
                                            : "bg-white/5 border-white/5 hover:bg-white/5/80"
                                    )}
                                >
                                    <Crown className={cn("size-5 mx-auto mb-2 transition-colors", activeStat === 2 ? (isPremium ? "text-amber-400" : "text-gray-400") : "text-gray-600")} />
                                    <p className={cn("text-2xl font-bold transition-colors", activeStat === 2 ? (isPremium ? "text-emerald-400" : "text-emerald-400/60") : "text-white/60")}>
                                        {isPremium ? "Pro" : "Free"}
                                    </p>
                                    <p className={cn("text-xs transition-colors", activeStat === 2 ? "text-emerald-400/80" : "text-gray-400/60")}>{t("plan")}</p>
                                </div>
                            </div>
                        </div>

                        {authUser?.role !== "admin" && (
                            <div className="bg-[#141414] border border-white/10 rounded-2xl p-6">
                                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <Key className="size-5 text-emerald-400" /> Security
                                </h2>
                                <div className="space-y-3">
                                    <button
                                        onClick={() => setShowPasswordModal(true)}
                                        className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Key className="size-5 text-gray-400 group-hover:text-white transition-colors" />
                                            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Change Password Request</span>
                                        </div>
                                        <ChevronRight className="size-4 text-gray-500" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (forgotPinAttempts >= 3) {
                                                toast.error("Too many failed attempts. You cannot submit more PIN reset requests.");
                                                return;
                                            }
                                            setShowForgotPin(true);
                                            setForgotPinStep("pin");
                                            setForgotPinNewPin("");
                                            setForgotPinKeys([]);
                                        }}
                                        className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors group ${forgotPinAttempts >= 3 ? 'bg-red-500/10 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10'}`}
                                        disabled={forgotPinAttempts >= 3}
                                    >
                                        <div className="flex items-center gap-3">
                                            <KeyRound className={`size-5 transition-colors ${isLocked ? 'text-red-500' : 'text-gray-400 group-hover:text-white'}`} />
                                            <span className={`text-sm font-medium transition-colors ${isLocked ? 'text-red-500' : 'text-gray-300 group-hover:text-white'}`}>
                                                {displayText}
                                            </span>
                                        </div>
                                        <ChevronRight className="size-4 text-gray-500" />
                                    </button>
                                    {(passwordRequests.length > 0 || pinResetRequests.length > 0) && (
                                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold px-1">Request History</p>
                                    )}
                                    {passwordRequests.map((req) => (
                                        <div key={req._id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                            {req.status === "approved" ? (
                                                <CheckCircle className="size-4 text-emerald-400 shrink-0" />
                                            ) : req.status === "rejected" ? (
                                                <XCircle className="size-4 text-red-400 shrink-0" />
                                            ) : (
                                                <Hourglass className="size-4 text-amber-400 shrink-0" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-medium text-gray-300">Password Change</span>
                                                    <span className={cn(
                                                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                                                        req.status === "approved" ? "bg-emerald-500/10 text-emerald-400" :
                                                        req.status === "rejected" ? "bg-red-500/10 text-red-400" :
                                                        "bg-amber-500/10 text-amber-400"
                                                    )}>
                                                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between gap-2 mt-1">
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(req.createdAt).toLocaleDateString("en-US", {
                                                            month: "short", day: "numeric", year: "numeric",
                                                            hour: "2-digit", minute: "2-digit"
                                                        })}
                                                    </span>
                                                    {req.approvedAt && (
                                                        <span className="text-xs text-emerald-400/60">
                                                            {new Date(req.approvedAt).toLocaleDateString("en-US", {
                                                                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                                                            })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {pinResetRequests.map((req) => (
                                        <div key={req._id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                            {req.status === "approved" ? (
                                                <CheckCircle className="size-4 text-emerald-400 shrink-0" />
                                            ) : req.status === "rejected" ? (
                                                <XCircle className="size-4 text-red-400 shrink-0" />
                                            ) : (
                                                <Hourglass className="size-4 text-amber-400 shrink-0" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-medium text-gray-300">PIN Reset</span>
                                                    <span className={cn(
                                                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                                                        req.status === "approved" ? "bg-emerald-500/10 text-emerald-400" :
                                                        req.status === "rejected" ? "bg-red-500/10 text-red-400" :
                                                        "bg-amber-500/10 text-amber-400"
                                                    )}>
                                                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between gap-2 mt-1">
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(req.createdAt).toLocaleDateString("en-US", {
                                                            month: "short", day: "numeric", year: "numeric",
                                                            hour: "2-digit", minute: "2-digit"
                                                        })}
                                                    </span>
                                                    {req.approvedAt && (
                                                        <span className="text-xs text-emerald-400/60">
                                                            {new Date(req.approvedAt).toLocaleDateString("en-US", {
                                                                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                                                            })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Support Card */}
                        <div className="bg-[#141414] border border-white/10 rounded-2xl p-6">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Headphones className="size-5 text-blue-400" /> Support
                            </h2>
                            <div className="space-y-3">
                                <div className="p-4 bg-white/5 rounded-xl">
                                    <p className="text-sm text-gray-400 mb-2">sugasrijayaramst@gmail.com</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => window.open("mailto:sugasrijayaramst@gmail.com?subject=BeatFlow Support", "_self")}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors text-sm"
                                        >
                                            <Mail className="size-4" /> Email
                                        </button>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText("sugasrijayaramst@gmail.com");
                                                toast.success("Copied!");
                                            }}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg transition-colors text-sm"
                                        >
                                            <Copy className="size-4" /> Copy
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl">
                                    <p className="text-sm text-gray-400 mb-2">sugasrijayaram2007@gmail.com</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => window.open("mailto:sugasrijayaram2007@gmail.com?subject=BeatFlow Support", "_self")}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors text-sm"
                                        >
                                            <Mail className="size-4" /> Email
                                        </button>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText("sugasrijayaram2007@gmail.com");
                                                toast.success("Copied!");
                                            }}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg transition-colors text-sm"
                                        >
                                            <Copy className="size-4" /> Copy
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Feedback Card */}
                        <div className="bg-[#141414] border border-white/10 rounded-2xl p-6">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <MessageSquare className="size-5 text-amber-400" /> Feedback
                            </h2>
                            
                            {!showFeedbackCard ? (
                                <div className="space-y-3">
                                    <button
                                        onClick={() => setShowFeedbackCard(true)}
                                        className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-left"
                                    >
                                        <p className="text-sm font-medium text-gray-300">Share your feedback</p>
                                        <p className="text-xs text-gray-500 mt-1">Help us improve</p>
                                    </button>
                                    
                                    {userFeedbacks.length > 0 && (
                                        <div className="space-y-2 mt-4">
                                            <p className="text-sm text-gray-400">Your recent feedback:</p>
                                            {userFeedbacks.slice(0, 3).map((fb: any) => (
                                                <div key={fb._id} className="p-3 bg-white/5 rounded-lg">
                                                    <div className="flex items-center gap-1 mb-1">
                                                        {[1,2,3,4,5].map((star) => (
                                                            <Star key={star} className={`size-3 ${star <= fb.rating ? "text-amber-400 fill-amber-400" : "text-gray-600"}`} />
                                                        ))}
                                                    </div>
                                                    <p className="text-sm text-gray-300 line-clamp-2">{fb.feedback}</p>
                                                    {fb.reply && (
                                                        <div className="mt-2 p-2 bg-emerald-500/10 rounded border border-emerald-500/20">
                                                            <p className="text-xs text-emerald-400">Admin: {fb.reply}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-center gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button key={star} onClick={() => setFeedbackRating(star)}>
                                                <Star className={`size-8 transition-colors ${star <= feedbackRating ? "text-amber-400 fill-amber-400" : "text-gray-600 hover:text-amber-300"}`} />
                                            </button>
                                        ))}
                                    </div>
                                    <textarea
                                        value={feedbackText}
                                        onChange={(e) => setFeedbackText(e.target.value)}
                                        placeholder="Write your feedback here..."
                                        className="w-full h-24 bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-amber-400/50 resize-none"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setShowFeedbackCard(false); setFeedbackText(""); setFeedbackRating(5); }}
                                            className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSubmitFeedback}
                                            disabled={submittingFeedback}
                                            className="flex-1 flex items-center justify-center gap-2 py-2 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {submittingFeedback ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                                            Submit
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Subscription Card */}
                        <div className="bg-[#141414] border border-white/10 rounded-2xl p-6">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <CreditCard className="size-5 text-emerald-400" /> {t("subscription")}
                            </h2>
                            {isPremium ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                        <Crown className="size-6 text-emerald-400 shrink-0" />
                                        <div>
                                            <p className="font-semibold text-emerald-400">{PLAN_NAMES[subscriptionPlan] || t("pro_plan")}</p>
                                            <p className="text-sm text-emerald-400/60">{PLAN_PRICES[subscriptionPlan]}</p>
                                        </div>
                                    </div>
                                    {expiryTimestamp && subscriptionPlan !== "admin" && (
                                        <>
                                            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                                                <Calendar className="size-4 text-gray-400 shrink-0" />
                                                <div>
                                                    <p className="text-xs text-gray-400">{t("expires")}</p>
                                                    <p className="text-sm font-medium text-white">
                                                        {new Date(expiryTimestamp).toLocaleDateString("en-US", {
                                                            year: "numeric", month: "long", day: "numeric",
                                                            hour: "2-digit", minute: "2-digit"
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                                                <Timer className="size-4 text-amber-400 shrink-0" />
                                                <div>
                                                    <p className="text-xs text-gray-400">{t("time_remaining")}</p>
                                                    <p className="text-sm font-bold text-amber-400">{remainingTime}</p>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    {subscriptionPlan === "admin" && (
                                        <div className="flex items-center gap-3 p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                                            <Crown className="size-4 text-emerald-400 shrink-0" />
                                            <p className="text-sm text-emerald-400/80">{t("admin_lifetime")}</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <p className="text-gray-400 mb-3">{t("free_plan_desc")}</p>
                                    <button
                                        onClick={() => navigate("/premium")}
                                        className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-full transition-colors"
                                    >
                                        {t("upgrade_to_pro")}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Preferences Card */}
                        <div className="bg-[#141414] border border-white/10 rounded-2xl p-6">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Bell className="size-5 text-emerald-400" /> {t("preferences")}
                            </h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Bell className="size-4 text-gray-400" />
                                        <span className="text-gray-300">{t("notifications")}</span>
                                    </div>
                                    <Switch
                                        checked={notifications}
                                        onCheckedChange={(c) => { setNotifications(c); savePreferences(c); }}
                                        disabled={saving}
                                    />
                                </div>
                                <div className="flex items-center justify-between relative">
                                    <div className="flex items-center gap-2">
                                        <Languages className="size-4 text-gray-400" />
                                        <span className="text-gray-300">{t("language")}</span>
                                    </div>
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowLangDropdown(!showLangDropdown)}
                                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white hover:bg-white/10 transition-colors"
                                        >
                                            {language === "en" ? "English" : language === "hi" ? "हिन्दी" : language === "ta" ? "தமிழ்" : "తెలుగు"}
                                        </button>
                                        {showLangDropdown && (
                                            <div ref={langDropdownRef} className="absolute right-0 top-full mt-2 w-32 bg-[#141414] rounded-xl shadow-xl border border-white/10 overflow-hidden z-50">
                                                {[
                                                    { value: "en", label: "English", native: "English" },
                                                    { value: "hi", label: "हिन्दी", native: "Hindi" },
                                                    { value: "ta", label: "தமிழ்", native: "Tamil" },
                                                    { value: "te", label: "తెలుగు", native: "Telugu" }
                                                ].map((lang) => (
                                                    <button
                                                        key={lang.value}
                                                        onClick={() => { setLanguage(lang.value as any); setShowLangDropdown(false); }}
                                                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left text-sm ${language === lang.value ? "text-emerald-400" : "text-white"}`}
                                                    >
                                                        {lang.label} <span className="text-gray-500">({lang.native})</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <RotateCcw className="size-3" /> {t("language_note")}
                                </p>
                            </div>
                        </div>

                        {/* Sign Out */}
                        <button
                            onClick={handleSignOut}
                            className="w-full py-3 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 text-red-400 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            <LogOut className="size-4" /> {t("sign_out")}
                        </button>
                    </div>
                </div>
            </ScrollArea>

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowPasswordModal(false)}>
                    <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-white mb-2">Request Password Change</h3>
                        <p className="text-sm text-gray-400 mb-4">Your request will be sent to admin for approval.</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Current Password</label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPassword ? "text" : "password"}
                                        value={currentPassword}
                                        onChange={(e) => { setCurrentPassword(e.target.value); setCurrentPassError(false); }}
                                        className={`w-full bg-white/10 border rounded-lg px-4 py-2.5 pr-10 text-white focus:outline-none focus:ring-2 ${currentPassError ? "border-red-500 focus:ring-red-500/50" : "border-white/20 focus:ring-emerald-500/50"}`}
                                        placeholder="Enter current password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">New Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2.5 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        placeholder="Enter new password (min 8 chars)"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                    </button>
                                </div>
                                <div className="mt-2 space-y-1">
                                    <p className={`text-xs ${newPassword.length >= 8 ? "text-emerald-400" : "text-gray-500"}`}>
                                        {newPassword.length >= 8 ? "✓" : "○"} At least 8 characters
                                    </p>
                                    <p className={`text-xs ${/[A-Z]/.test(newPassword) ? "text-emerald-400" : "text-gray-500"}`}>
                                        {/[A-Z]/.test(newPassword) ? "✓" : "○"} One uppercase letter
                                    </p>
                                    <p className={`text-xs ${/[a-z]/.test(newPassword) ? "text-emerald-400" : "text-gray-500"}`}>
                                        {/[a-z]/.test(newPassword) ? "✓" : "○"} One lowercase letter
                                    </p>
                                    <p className={`text-xs ${/[0-9]/.test(newPassword) ? "text-emerald-400" : "text-gray-500"}`}>
                                        {/[0-9]/.test(newPassword) ? "✓" : "○"} One number
                                    </p>
                                    <p className={`text-xs ${/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? "text-emerald-400" : "text-gray-500"}`}>
                                        {/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? "✓" : "○"} One special character
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => { setShowPasswordModal(false); setCurrentPassword(""); setNewPassword(""); setShowPassword(false); setShowCurrentPassword(false); setCurrentPassError(false); }}
                                    className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleChangePassword}
                                    disabled={saving}
                                    className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 rounded-lg text-black font-bold transition-colors disabled:opacity-50"
                                >
                                    {saving ? "Sending..." : "Send Request"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Crop Modal */}
            {showCropModal && cropImage && (
                <CropModal imageSrc={cropImage} onComplete={handleCropComplete} onCancel={() => { setShowCropModal(false); setCropImage(null); }} />
            )}
        </div>
    );
};

const CropModal = ({ imageSrc, onComplete, onCancel }: { imageSrc: string; onComplete: (canvas: HTMLCanvasElement) => void; onCancel: () => void }) => {
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const imgRef = useRef<HTMLImageElement>(null);

    const handleDown = (clientX: number, clientY: number) => {
        setDragging(true);
        setStartPos({ x: clientX - offset.x, y: clientY - offset.y });
    };

    const handleMove = (clientX: number, clientY: number) => {
        if (!dragging) return;
        setOffset({ x: clientX - startPos.x, y: clientY - startPos.y });
    };

    const handleUp = () => setDragging(false);

    const handleCrop = () => {
        const img = imgRef.current;
        if (!img) return;

        const size = 300;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();

        const containerSize = 256;
        const imgAspect = img.naturalWidth / img.naturalHeight;
        let renderW: number, renderH: number;
        
        if (imgAspect > 1) {
            renderH = 256 * zoom;
            renderW = renderH * imgAspect;
        } else {
            renderW = 256 * zoom;
            renderH = renderW / imgAspect;
        }

        const scale = size / containerSize;
        const drawX = (size - renderW * scale) / 2 + offset.x * scale;
        const drawY = (size - renderH * scale) / 2 + offset.y * scale;

        ctx.drawImage(img, drawX, drawY, renderW * scale, renderH * scale);
        onComplete(canvas);
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
            <div className="bg-[#1a1a1a] rounded-2xl p-6 max-w-sm w-full border border-white/10" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Crop className="size-5 text-emerald-400" /> Crop Profile Picture
                    </h3>
                    <button onClick={onCancel} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="size-5 text-gray-400" />
                    </button>
                </div>

                <div
                    className="w-48 h-48 mx-auto rounded-full overflow-hidden cursor-move relative"
                    onMouseDown={(e) => handleDown(e.clientX, e.clientY)}
                    onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
                    onMouseUp={handleUp}
                    onMouseLeave={handleUp}
                    onTouchStart={(e) => handleDown(e.touches[0].clientX, e.touches[0].clientY)}
                    onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
                    onTouchEnd={handleUp}
                >
                    <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{
                            transform: `translate(${offset.x}px, ${offset.y}px)`,
                            transition: dragging ? "none" : "transform 0.1s ease-out"
                        }}
                    >
                        <img
                            ref={imgRef}
                            src={imageSrc}
                            alt="Crop"
                            style={{
                                maxWidth: "none",
                                width: `${256 * zoom}px`,
                                height: `${256 * zoom}px`,
                                objectFit: "cover"
                            }}
                            draggable={false}
                        />
                    </div>
                    <div className="absolute inset-0 rounded-full border-2 border-white/30 pointer-events-none" />
                </div>

                <div className="mt-4">
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">Zoom</span>
                        <input
                            type="range"
                            min="0.5"
                            max="1.5"
                            step="0.05"
                            value={zoom}
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className="flex-1 accent-emerald-500"
                        />
                        <span className="text-xs text-gray-400 w-8 text-right">{Math.round(zoom * 100)}%</span>
                    </div>
                </div>

                <div className="flex gap-3 mt-4">
                    <button onClick={onCancel} className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleCrop} className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 rounded-lg text-black font-bold transition-colors">
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
