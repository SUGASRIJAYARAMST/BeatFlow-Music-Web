import { useNavigate, useLocation } from "react-router-dom";
import { useUser, useClerk } from "@clerk/react";
import { User as UserIcon, ChevronLeft, ChevronRight, LogOut, User, LayoutDashboard } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useNavHistory } from "../../utils/navHistory";
import NotificationBell from "../common/NotificationBell";
import { useAuthStore } from "../../stores/useAuthStore";

const Topbar = () => {
    const { user } = useUser();
    const { signOut } = useClerk();
    const navigate = useNavigate();
    const location = useLocation();
    const { canBack, canFwd, push, back, forward } = useNavHistory();
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const isAdmin = useAuthStore((state) => state.isAdmin);

    useEffect(() => {
        push(location.pathname);
    }, [location.pathname, push]);

    const handleBack = () => {
        const path = back();
        if (path) navigate(path);
    };

    const handleForward = () => {
        const path = forward();
        if (path) navigate(path);
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className='flex items-center justify-between p-4  sticky top-0 z-50 border-b border-white/0'>
            <div className='flex gap-2'>
                {canBack && (
                    <button
                        onClick={handleBack}
                        className='size-9 glass-dark rounded-full flex items-center justify-center hover:bg-white/10 transition-all duration-300 border border-white/5'
                    >
                        <ChevronLeft className='size-5 text-emerald-400' />
                    </button>
                )}
                {canFwd && (
                    <button
                        onClick={handleForward}
                        className='size-9 glass-dark rounded-full flex items-center justify-center hover:bg-white/10 transition-all duration-300 border border-white/5'
                    >
                        <ChevronRight className='size-5 text-emerald-400' />
                    </button>
                )}
            </div>
            <div className="flex items-center gap-4">
                {user && <NotificationBell />}
                {user ? (
                    <div className="relative" ref={dropdownRef}>
                        <div
                            onClick={() => setShowDropdown(!showDropdown)}
                            className='flex items-center gap-3 glass-dark rounded-full p-1 pr-4 hover:bg-white/10 transition-all duration-300 cursor-pointer border border-white/5'
                        >
                            {user.imageUrl ? (
                                <img src={user.imageUrl} alt={user.fullName || ""} className='size-8 rounded-full border border-emerald-500/20' />
                            ) : (
                                <div className='size-8 bg-emerald-500/10 rounded-full flex items-center justify-center'>
                                    <UserIcon className='size-4 text-emerald-400' />
                                </div>
                            )}
                            <span className='text-sm font-medium text-gradient'>{user.fullName}</span>
                        </div>
                        {showDropdown && (
                            <div className="absolute right-0 mt-2 w-48 glass-dark rounded-xl border border-white/10 overflow-hidden shadow-xl">
                                {isAdmin && (
                                    <button
                                        onClick={() => { navigate("/admin"); setShowDropdown(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left"
                                    >
                                        <LayoutDashboard className="size-4 text-amber-400" />
                                        <span className="text-sm font-medium">Admin Dashboard</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => { navigate("/profile"); setShowDropdown(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left"
                                >
                                    <User className="size-4 text-emerald-400" />
                                    <span className="text-sm font-medium">Profile</span>
                                </button>
                                <button
                                    onClick={() => { signOut(); navigate("/"); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left text-red-400"
                                >
                                    <LogOut className="size-4" />
                                    <span className="text-sm font-medium">Sign Out</span>
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={() => navigate("/")}
                        className='btn bg-emerald-500 hover:bg-emerald-400 text-black border-none font-bold rounded-full px-6 hover:scale-105 transition-all shadow-lg shadow-emerald-500/20'
                    >
                        Sign Up
                    </button>
                )}
            </div>
        </div>
    );
};

export default Topbar;
