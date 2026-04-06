import { useAuthStore } from "../stores/useAuthStore";
import { useAuth, useUser } from "@clerk/react";
import { Loader } from "lucide-react";
import { useEffect, useState } from "react";
import { useUserStore } from "../stores/useUserStore";
import { useSubscriptionStore } from "../stores/useSubscriptionStore";
import { usePlayerStore } from "../stores/usePlayerStore";
import { useMusicStore } from "../stores/useMusicStore";

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const { getToken, userId, isLoaded, signOut } = useAuth();
    const { user: clerkUser } = useUser();
    const [loading, setLoading] = useState(true);
    const checkAdminStatus = useAuthStore((state) => state.checkAdminStatus);
    const fetchUserProfile = useAuthStore((state) => state.fetchUserProfile);
    const authUser = useAuthStore((state) => state.user);
    const { syncUser } = useUserStore();
    const subscriptionStore = useSubscriptionStore();
    const { setPremiumStatus } = usePlayerStore();
    const { fetchLikedSongs } = useMusicStore();

    useEffect(() => {
        sessionStorage.setItem("beatflow_session", "active");

        const handleBeforeUnload = () => {
            sessionStorage.removeItem("beatflow_session");
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, []);

    useEffect(() => {
        const initAuth = async () => {
            if (!isLoaded) return;
            
            try {
                const token = await getToken();
                const sessionActive = sessionStorage.getItem("beatflow_session");
                
                if (token && clerkUser) {
                    if (!sessionActive) {
                        await signOut();
                        window.location.href = "/";
                        return;
                    }
                    await Promise.all([
                        syncUser(clerkUser),
                        checkAdminStatus(),
                        fetchUserProfile(),
                        fetchLikedSongs(),
                    ]);
                    
                    await subscriptionStore.checkSubscription();
                    const subState = useSubscriptionStore.getState();
                    const authState = useAuthStore.getState();
                    setPremiumStatus(subState.isPremium, authState.user?.role || null);
                }
            } catch (error: any) {
                console.error("Error in auth provider", error);
            } finally {
                setLoading(false);
            }
        };

        if (isLoaded) {
            initAuth();
        }
    }, [isLoaded, getToken, userId, clerkUser, checkAdminStatus, fetchUserProfile, syncUser, signOut]);

    if (loading)
        return (
            <div className='h-screen w-full flex items-center justify-center bg-base-300'>
                <Loader className='size-8 text-primary animate-spin' />
            </div>
        );

    return <>{children}</>;
};

export default AuthProvider;
