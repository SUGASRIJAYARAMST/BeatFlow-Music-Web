import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import type { Playlist, Song } from "../types";
import { useNotificationStore } from "./useNotificationStore";

interface PlaylistStore {
    playlists: Playlist[];
    currentPlaylist: Playlist | null;
    isLoading: boolean;
    error: string | null;
    cacheTime: number;

    fetchPlaylists: (force?: boolean) => Promise<void>;
    fetchPlaylistById: (id: string) => Promise<void>;
    createPlaylist: (name: string, description?: string, organizationType?: "list" | "tree" | "genre" | "artist") => Promise<void>;
    updatePlaylist: (id: string, data: Partial<Playlist>) => Promise<void>;
    deletePlaylist: (id: string) => Promise<void>;
    addSongToPlaylist: (playlistId: string, songId: string) => Promise<void>;
    removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
}

const CACHE_DURATION = 5 * 60 * 1000;

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
    playlists: [],
    currentPlaylist: null,
    isLoading: false,
    error: null,
    cacheTime: 0,

    fetchPlaylists: async (force = false) => {
        const now = Date.now();
        if (!force && get().cacheTime && now - get().cacheTime < CACHE_DURATION && get().playlists.length > 0) {
            return;
        }
        set({ isLoading: true, error: null });
        try {
            const response = await axiosInstance.get("/playlists");
            set({ playlists: response.data, cacheTime: now });
        } catch (error: any) {
            set({ error: error.response?.data?.message || error.message });
        } finally {
            set({ isLoading: false });
        }
    },

    fetchPlaylistById: async (id) => {
        set({ isLoading: true, error: null });
        try {
            const response = await axiosInstance.get(`/playlists/${id}`);
            set({ currentPlaylist: response.data });
        } catch (error: any) {
            set({ error: error.response?.data?.message || error.message });
            set({ currentPlaylist: null });
        } finally {
            set({ isLoading: false });
        }
    },

    createPlaylist: async (name, description, organizationType) => {
        const { addNotification } = useNotificationStore.getState();
        set({ isLoading: true, error: null });
        try {
            const response = await axiosInstance.post("/playlists", {
                name, description, organizationType
            });
            set((state) => ({ playlists: [...state.playlists, response.data.playlist] }));
            addNotification(`Created playlist "${name}"`, "success");
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message);
        } finally {
            set({ isLoading: false });
        }
    },

    updatePlaylist: async (id, data) => {
        const { addNotification } = useNotificationStore.getState();
        set({ isLoading: true, error: null });
        try {
            const response = await axiosInstance.put(`/playlists/${id}`, data);
            set((state) => ({
                playlists: state.playlists.map((p) => p._id === id ? response.data.playlist : p),
                currentPlaylist: response.data.playlist
            }));
            addNotification(`Updated playlist "${data.name || 'playlist'}"`, "info");
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message);
        } finally {
            set({ isLoading: false });
        }
    },

    deletePlaylist: async (id) => {
        const { addNotification } = useNotificationStore.getState();
        const playlistName = get().playlists.find(p => p._id === id)?.name || "playlist";
        set({ isLoading: true, error: null });
        try {
            await axiosInstance.delete(`/playlists/${id}`);
            set((state) => ({
                playlists: state.playlists.filter((p) => p._id !== id),
                currentPlaylist: state.currentPlaylist?._id === id ? null : state.currentPlaylist
            }));
            addNotification(`Deleted playlist "${playlistName}"`, "info");
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message);
        } finally {
            set({ isLoading: false });
        }
    },

    addSongToPlaylist: async (playlistId, songId) => {
        const { addNotification } = useNotificationStore.getState();
        const playlistName = get().playlists.find(p => p._id === playlistId)?.name || "playlist";
        try {
            const response = await axiosInstance.post(`/playlists/${playlistId}/songs`, { songId });
            const updatedPlaylist = response.data.playlist;

            // Update playlists state with the latest data
            set((state) => ({
                currentPlaylist: updatedPlaylist,
                playlists: state.playlists.map((p) => p._id === playlistId ? updatedPlaylist : p),
            }));

            addNotification(`Added to "${playlistName}" playlist`, "success");
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message);
        }
    },

    removeSongFromPlaylist: async (playlistId, songId) => {
        const { addNotification } = useNotificationStore.getState();
        const playlistName = get().playlists.find(p => p._id === playlistId)?.name || "playlist";
        try {
            const response = await axiosInstance.delete(`/playlists/${playlistId}/songs/${songId}`);
            set((state) => ({
                currentPlaylist: response.data.playlist,
                playlists: state.playlists.map((p) => p._id === playlistId ? response.data.playlist : p),
            }));
            addNotification(`Removed from "${playlistName}" playlist`, "info");
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message);
        }
    },
}));
