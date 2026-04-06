import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import type { User } from "../types";

interface AuthStore {
    user: User | null;
    isAdmin: boolean;
    isLoading: boolean;
    error: string | null;
    initialized: boolean;
    checkAdminStatus: () => Promise<void>;
    fetchUserProfile: () => Promise<void>;
    reset: () => void;
}

let checkAdminPromise: Promise<void> | null = null;
let fetchProfilePromise: Promise<void> | null = null;

export const useAuthStore = create<AuthStore>((set, get) => ({
    user: null,
    isAdmin: false,
    isLoading: false,
    error: null,
    initialized: false,

    checkAdminStatus: async () => {
        if (checkAdminPromise) return checkAdminPromise;

        checkAdminPromise = (async () => {
            set({ isLoading: true, error: null });
            try {
                const response = await axiosInstance.get("/auth/check-admin");
                set({ isAdmin: response.data.admin });
            } catch (error: any) {
                set({ isAdmin: false, error: error.response?.data?.message || "" });
            } finally {
                set({ isLoading: false });
                checkAdminPromise = null;
            }
        })();

        return checkAdminPromise;
    },

    fetchUserProfile: async () => {
        if (fetchProfilePromise) return fetchProfilePromise;

        fetchProfilePromise = (async () => {
            set({ isLoading: true, error: null });
            try {
                const response = await axiosInstance.get("/users/profile");
                set({ user: response.data });
            } catch (error: any) {
                set({ user: null, error: error.response?.data?.message || "" });
            } finally {
                set({ isLoading: false });
                fetchProfilePromise = null;
            }
        })();

        return fetchProfilePromise;
    },

    reset: () => {
        set({ user: null, isAdmin: false, isLoading: false, error: null, initialized: false });
        checkAdminPromise = null;
        fetchProfilePromise = null;
    },
}));