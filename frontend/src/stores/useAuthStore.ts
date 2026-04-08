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
    setInitialized: (val: boolean) => void;
}

let checkAdminPromise: Promise<void> | null = null;
let fetchProfilePromise: Promise<void> | null = null;

const AUTH_STORAGE_KEY = "beatflow_auth_state";

const loadPersistedAuth = () => {
    try {
        const data = localStorage.getItem(AUTH_STORAGE_KEY);
        if (data) return JSON.parse(data);
    } catch {}
    return { isAdmin: false, user: null };
};

const savePersistedAuth = (isAdmin: boolean, user: User | null) => {
    try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ isAdmin, user }));
    } catch {}
};

const persisted = loadPersistedAuth();

export const useAuthStore = create<AuthStore>((set, get) => ({
    user: persisted.user || null,
    isAdmin: persisted.isAdmin ?? false,
    isLoading: false,
    error: null,
    initialized: false,

    checkAdminStatus: async () => {
        if (checkAdminPromise) return checkAdminPromise;

        checkAdminPromise = (async () => {
            set({ isLoading: true, error: null });
            try {
                const response = await axiosInstance.get("/auth/check-admin");
                const isAdmin = response.data.admin;
                set({ isAdmin });
                savePersistedAuth(isAdmin, get().user);
            } catch (error: any) {
                set({ isAdmin: false, error: error.response?.data?.message || "" });
                savePersistedAuth(false, get().user);
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
                console.log("Fetched user profile:", response.data.clerkId, response.data.fullName);
                set({ user: response.data });
                savePersistedAuth(get().isAdmin, response.data);
            } catch (error: any) {
                console.error("Fetch user profile error:", error);
                set({ user: null, error: error.response?.data?.message || "" });
                localStorage.removeItem(AUTH_STORAGE_KEY);
            } finally {
                set({ isLoading: false });
                fetchProfilePromise = null;
            }
        })();

        return fetchProfilePromise;
    },

    setInitialized: (val) => set({ initialized: val }),

    reset: () => {
        set({ user: null, isAdmin: false, isLoading: false, error: null, initialized: false });
        checkAdminPromise = null;
        fetchProfilePromise = null;
        localStorage.removeItem(AUTH_STORAGE_KEY);
    },
}));