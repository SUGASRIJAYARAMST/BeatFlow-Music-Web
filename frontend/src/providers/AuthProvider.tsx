import { useAuthStore } from "../stores/useAuthStore";
import { useAuth, useUser } from "@clerk/react";
import { Loader } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useUserStore } from "../stores/useUserStore";
import { usePlayerStore } from "../stores/usePlayerStore";
import { useMusicStore } from "../stores/useMusicStore";
import { axiosInstance } from "../lib/axios";

const AUTH_CACHE_KEY = "beatflow_auth_cache";
const SUB_CACHE_KEY = "beatflow_sub_cache";
const LIKED_CACHE_KEY = "beatflow_liked_cache";

interface CachedAuthData {
    user: any;
    isAdmin: boolean;
    likedSongs: any[];
    expiryTimestamp: number | null;
    timestamp: number;
}

const getCachedAuth = (): CachedAuthData | null => {
    try {
        const data = localStorage.getItem(AUTH_CACHE_KEY);
        if (data) {
            const parsed = JSON.parse(data);
            if (parsed.timestamp && Date.now() - parsed.timestamp < 30 * 60 * 1000) {
                return parsed;
            }
        }
    } catch {}
    return null;
};

const saveCachedAuth = (data: CachedAuthData) => {
    try {
        localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ ...data, timestamp: Date.now() }));
    } catch {}
};

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const { getToken, userId, isLoaded, signOut } = useAuth();
    const { user: clerkUser } = useUser();
    const [isReady, setIsReady] = useState(false);
    const [isInitialRender, setIsInitialRender] = useState(true);
    const initRef = useRef(false);
    const { syncUser } = useUserStore();
    const { setPremiumStatus, setUserId } = usePlayerStore();
    const { setLikedSongs } = useMusicStore();
    const authStore = useAuthStore();
    const cachedAuth = getCachedAuth();

    useEffect(() => {
        sessionStorage.setItem("beatflow_session", "active");
        const handleBeforeUnload = () => sessionStorage.removeItem("beatflow_session");
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, []);

    useEffect(() => {
        if (!isLoaded || initRef.current) return;
        initRef.current = true;

        const initAuth = async () => {
            try {
                const token = await getToken();
                const sessionActive = sessionStorage.getItem("beatflow_session");

                if (token && clerkUser) {
                    if (!sessionActive) {
                        await signOut();
                        window.location.href = "/";
                        return;
                    }

                    if (cachedAuth) {
                        authStore.set({ 
                            user: cachedAuth.user, 
                            isAdmin: cachedAuth.isAdmin,
                            likedSongs: cachedAuth.likedSongs,
                            initialized: true 
                        });
                        setLikedSongs(cachedAuth.likedSongs);
                        const isPremium = cachedAuth.expiryTimestamp ? Date.now() < cachedAuth.expiryTimestamp : false;
                        setPremiumStatus(isPremium || cachedAuth.isAdmin, cachedAuth.user?.role || null);
                        setUserId(userId || null);
                        setIsReady(true);

                        syncUser(clerkUser).catch(() => {});
                        refreshAuthInBackground();
                    } else {
                        setUserId(userId || null);
                        await syncUser(clerkUser);
                        await fetchAndCacheAuth();
                        setIsReady(true);
                    }
                } else {
                    setIsReady(true);
                }
            } catch (error) {
                console.error("Auth init error:", error);
                setIsReady(true);
            }
        };

        initAuth();
    }, [isLoaded]);

    const fetchAndCacheAuth = async () => {
        try {
            const [userRes, subRes] = await Promise.all([
                axiosInstance.get("/users/me").catch(() => null),
                axiosInstance.get("/payments/check-subscription").catch(() => null)
            ]);

            if (userRes?.data) {
                const { user, isAdmin, likedSongs, expiryTimestamp } = userRes.data;
                authStore.set({ user, isAdmin, likedSongs: likedSongs || [] });
                setLikedSongs(likedSongs || []);
                
                const expiry = expiryTimestamp || subRes?.data?.expiryTimestamp;
                const isPremium = expiry ? Date.now() < expiry : false;
                setPremiumStatus(isPremium || isAdmin, user?.role || null);
                
                        saveCachedAuth({ user, isAdmin, likedSongs: likedSongs || [], expiryTimestamp: expiry, timestamp: Date.now() });
            }
        } catch (error) {
            console.error("Background auth refresh failed:", error);
        }
    };

    const refreshAuthInBackground = () => {
        fetchAndCacheAuth().catch(() => {});
    };

    if (!isReady)
        return (
            <div className='h-screen w-full flex items-center justify-center bg-base-300'>
                <Loader className='size-8 text-primary animate-spin' />
            </div>
        );

    return <>{children}</>;
};

export default AuthProvider;
