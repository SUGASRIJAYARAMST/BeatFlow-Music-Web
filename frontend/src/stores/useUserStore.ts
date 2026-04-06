import { create } from "zustand";
import { axiosInstance } from "../lib/axios";

interface SyncUserStore {
    syncUser: (clerkUser: any) => Promise<void>;
}

let syncPromise: Promise<void> | null = null;

export const useUserStore = create<SyncUserStore>(() => ({
    syncUser: async (clerkUser) => {
        if (!clerkUser) return;
        if (syncPromise) return syncPromise;

        syncPromise = (async () => {
            try {
                await axiosInstance.post("/auth/callback", {
                    id: clerkUser.id,
                    firstName: clerkUser.firstName,
                    lastName: clerkUser.lastName,
                    imageUrl: clerkUser.imageUrl,
                    primaryEmail: clerkUser.primaryEmailAddress?.emailAddress,
                });
            } catch (error) {
                console.error("User sync error:", error);
            } finally {
                syncPromise = null;
            }
        })();

        return syncPromise;
    },
}));
