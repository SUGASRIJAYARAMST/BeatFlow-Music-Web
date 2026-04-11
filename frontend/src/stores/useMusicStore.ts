import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import axios from "axios";
import toast from "react-hot-toast";
import type { Song, Album, Stats } from "../types";
import { useNotificationStore } from "./useNotificationStore";

interface MusicStore {
    songs: Song[];
    albums: Album[];
    isLoading: boolean;
    error: string | null;
    currentAlbum: Album | null;
    featuredSongs: Song[];
    madeForYouSongs: Song[];
    trendingSongs: Song[];
    recentSongs: Song[];
    newSongs: Song[];
    stats: Stats;
    likedSongs: Song[];
    searchResults: { songs: Song[]; albums: Album[] };
    cacheTime: { [key: string]: number };
    fetchAlbums: (force?: boolean) => Promise<void>;
    fetchAlbumById: (id: string) => Promise<void>;
    fetchFeaturedSongs: (force?: boolean) => Promise<void>;
    fetchMadeForYouSongs: (force?: boolean) => Promise<void>;
    fetchTrendingSongs: (force?: boolean) => Promise<void>;
    fetchRecentSongs: () => Promise<void>;
    fetchStats: () => Promise<void>;
    fetchSongs: (force?: boolean) => Promise<void>;
    fetchAllHomeData: () => Promise<void>;
    deleteSong: (id: string) => Promise<void>;
    deleteAlbum: (id: string) => Promise<void>;
    fetchLikedSongs: () => Promise<void>;
    toggleLike: (songId: string) => Promise<void>;
    updateSongInCache: (updatedSong: Song) => void;
    search: (query: string, signal?: AbortSignal) => Promise<void>;
}

const CACHE_DURATION = 10 * 60 * 1000;

export const useMusicStore = create<MusicStore>((set, get) => ({
    songs: [],
    albums: [],
    isLoading: false,
    error: null,
    currentAlbum: null,
    madeForYouSongs: [],
    featuredSongs: [],
    trendingSongs: [],
    recentSongs: [],
    newSongs: [],
    likedSongs: [],
    searchResults: { songs: [], albums: [] },
    cacheTime: {},
    stats: {
        totalSongs: 0,
        totalAlbums: 0,
        totalUsers: 0,
        totalPremium: 0,
        totalPlaylists: 0,
        totalRevenue: 0,
        recentPayments: []
    },

    deleteSong: async (id) => {
        set({ isLoading: true, error: null });
        try {
            await axiosInstance.delete(`/admin/songs/${id}`);
            set((state) => ({
                songs: state.songs.filter((song) => song._id !== id),
            }));
            //toast.success("Song deleted successfully");
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message);
        } finally {
            set({ isLoading: false });
        }
    },

    deleteAlbum: async (id) => {
        set({ isLoading: true, error: null });
        try {
            await axiosInstance.delete(`/admin/albums/${id}`);
            set((state) => ({
                albums: state.albums.filter((album) => album._id !== id),
            }));
            toast.success("Album deleted successfully");
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message);
        } finally {
            set({ isLoading: false });
        }
    },

    fetchSongs: async (force = false) => {
        const now = Date.now();
        if (!force && get().cacheTime.songs && now - get().cacheTime.songs < CACHE_DURATION && get().songs.length > 0) {
            console.log("🔄 Using cached songs:", get().songs.length);
            return;
        }
        try {
            console.log("📥 Fetching fresh songs from /songs...");
            const response = await axiosInstance.get("/songs");
            console.log("📦 Response from /songs:", response.data);
            
            // Handle both possible response formats: { songs: [...] } or [...]
            let songsData = [];
            if (Array.isArray(response.data)) {
                songsData = response.data;
            } else if (response.data && Array.isArray(response.data.songs)) {
                songsData = response.data.songs;
            }
            // Ensure we always have an array
            songsData = Array.isArray(songsData) ? songsData : [];
            console.log("✅ Processed songs:", songsData.length, "songs loaded");
            
            const sorted = [...songsData].sort((a, b) => {
                const dateA = new Date(a.createdAt).getTime();
                const dateB = new Date(b.createdAt).getTime();
                return dateB - dateA;
            });
            set({ songs: sorted, cacheTime: { ...get().cacheTime, songs: now } });
            console.log("🎵 Store updated with", sorted.length, "songs");
        } catch (error: any) {
            console.error("❌ Fetch songs error:", error);
            set({ error: error.response?.data?.message || error.message });
        }
    },

    fetchAllHomeData: async (force = false) => {
        const now = Date.now();
        const cache = get().cacheTime;
        const isCacheValid = (key: string) => !force && cache[key] && now - cache[key] < CACHE_DURATION;

        if (isCacheValid("featured") && isCacheValid("madeForYou") && isCacheValid("trending") && isCacheValid("songs") && isCacheValid("albums") && isCacheValid("newSongs")) {
            return;
        }

        set({ isLoading: true, error: null });

        try {
            const [featuredRes, madeForYouRes, trendingRes, songsRes, albumsRes, newSongsRes] = await Promise.all([
                isCacheValid("featured") ? Promise.resolve({ data: get().featuredSongs }) : axiosInstance.get("/songs/featured"),
                isCacheValid("madeForYou") ? Promise.resolve({ data: get().madeForYouSongs }) : axiosInstance.get("/songs/made-for-you"),
                isCacheValid("trending") ? Promise.resolve({ data: get().trendingSongs }) : axiosInstance.get("/songs/trending"),
                isCacheValid("songs") ? Promise.resolve({ data: { songs: get().songs } }) : axiosInstance.get("/songs"),
                isCacheValid("albums") ? Promise.resolve({ data: get().albums }) : axiosInstance.get("/albums"),
                isCacheValid("newSongs") ? Promise.resolve({ data: get().newSongs }) : axiosInstance.get("/songs/new")
            ]);

            const songsData = songsRes.data.songs || songsRes.data;
            const shuffled = [...(Array.isArray(songsData) ? songsData : [])].sort(() => Math.random() - 0.5);
            
            let albumsData = albumsRes.data;
            if (albumsData && albumsData.albums) albumsData = albumsData.albums;
            const albumsShuffled = [...(Array.isArray(albumsData) ? albumsData : [])].sort(() => Math.random() - 0.5);

            set({
                featuredSongs: featuredRes.data,
                madeForYouSongs: madeForYouRes.data,
                trendingSongs: trendingRes.data,
                songs: shuffled,
                albums: albumsShuffled,
                newSongs: newSongsRes.data || [],
                isLoading: false,
                cacheTime: {
                    ...get().cacheTime,
                    featured: now,
                    madeForYou: now,
                    trending: now,
                    songs: now,
                    albums: now,
                    newSongs: now
                }
            });
        } catch (error: any) {
            set({ error: error.response?.data?.message || error.message, isLoading: false });
        }
    },

    fetchStats: async () => {
        try {
            const response = await axiosInstance.get("/admin/stats");
            set({ stats: response.data });
        } catch (error: any) {
            set({ error: error.response?.data?.message || error.message });
        }
    },

    fetchAlbums: async (force = false) => {
        const now = Date.now();
        if (!force && get().cacheTime.albums && now - get().cacheTime.albums < CACHE_DURATION && get().albums.length > 0) {
            return;
        }
        try {
            const response = await axiosInstance.get("/albums");
            let albumsData = [];
            if (Array.isArray(response.data)) {
                albumsData = response.data;
            } else if (response.data && Array.isArray(response.data.albums)) {
                albumsData = response.data.albums;
            }
            albumsData = Array.isArray(albumsData) ? albumsData : [];
            if (albumsData.length > 0) {
                set({ albums: albumsData, cacheTime: { ...get().cacheTime, albums: now } });
            } else {
                set({ albums: [] });
            }
        } catch (error: any) {
            set({ error: error.response?.data?.message || error.message });
        }
    },

    fetchAlbumById: async (id) => {
        set({ isLoading: true, error: null });
        try {
            let headers: Record<string, string> = { 
                "Content-Type": "application/json",
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
            };
            if (window.Clerk?.session?.getToken) {
                const token = await window.Clerk.session.getToken();
                if (token) headers["Authorization"] = `Bearer ${token}`;
            }
            const cacheBuster = `?t=${Date.now()}`;
            const response = await fetch(`/api/albums/${id}${cacheBuster}`, { 
                credentials: "include",
                headers,
                cache: "no-store"
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Failed to fetch album");
            }
            set({ currentAlbum: data, error: null });
        } catch (error: any) {
            set({ error: error.message, currentAlbum: null });
        } finally {
            set({ isLoading: false });
        }
    },

    fetchFeaturedSongs: async (force = false) => {
        const now = Date.now();
        if (!force && get().cacheTime.featured && now - get().cacheTime.featured < CACHE_DURATION && get().featuredSongs.length > 0) {
            return;
        }
        try {
            const response = await axiosInstance.get("/songs/featured");
            set({ featuredSongs: response.data, cacheTime: { ...get().cacheTime, featured: now } });
        } catch (error: any) {
            set({ error: error.response?.data?.message || error.message });
        }
    },

    fetchMadeForYouSongs: async (force = false) => {
        const now = Date.now();
        if (!force && get().cacheTime.madeForYou && now - get().cacheTime.madeForYou < CACHE_DURATION && get().madeForYouSongs.length > 0) {
            return;
        }
        try {
            const response = await axiosInstance.get("/songs/made-for-you");
            set({ madeForYouSongs: response.data, cacheTime: { ...get().cacheTime, madeForYou: now } });
        } catch (error: any) {
            set({ error: error.response?.data?.message || error.message });
        }
    },

    fetchTrendingSongs: async (force = false) => {
        const now = Date.now();
        if (!force && get().cacheTime.trending && now - get().cacheTime.trending < CACHE_DURATION && get().trendingSongs.length > 0) {
            return;
        }
        try {
            const response = await axiosInstance.get("/songs/trending");
            set({ trendingSongs: response.data, cacheTime: { ...get().cacheTime, trending: now } });
        } catch (error: any) {
            set({ error: error.response?.data?.message || error.message });
        }
    },

    fetchRecentSongs: async () => {
        try {
            const response = await axiosInstance.get("/songs/recent");
            set({ recentSongs: response.data });
        } catch (error: any) {
            set({ error: error.response?.data?.message || error.message });
        }
    },

    fetchLikedSongs: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await axiosInstance.get("/users/liked-songs");
            set({ likedSongs: response.data });
        } catch (error: any) {
            set({ error: error.response?.data?.message || error.message });
        } finally {
            set({ isLoading: false });
        }
    },

    toggleLike: async (songId) => {
        try {
            const response = await axiosInstance.post("/users/like", { songId });
            const { addNotification } = useNotificationStore.getState();
            const song = get().songs.find(s => s._id === songId) || 
                         get().featuredSongs.find(s => s._id === songId) ||
                         get().trendingSongs.find(s => s._id === songId) ||
                         get().madeForYouSongs.find(s => s._id === songId);
            const songTitle = song?.title || "Song";
            
            if (response.data.success) {
                const isLiked = response.data.isLiked;
                if (isLiked) {
                    if (song) set((state) => ({ likedSongs: [...state.likedSongs, song] }));
                    addNotification(`Liked "${songTitle}"`, "success");
                } else {
                    set((state) => ({
                        likedSongs: state.likedSongs.filter((song) => song._id !== songId)
                    }));
                    addNotification(`Unliked "${songTitle}"`, "info");
                }
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message);
        }
    },

    updateSongInCache: (updatedSong) => {
        set((state) => ({
            songs: state.songs.map((s) => s._id === updatedSong._id ? updatedSong : s),
            featuredSongs: state.featuredSongs.map((s) => s._id === updatedSong._id ? updatedSong : s),
            trendingSongs: state.trendingSongs.map((s) => s._id === updatedSong._id ? updatedSong : s),
            madeForYouSongs: state.madeForYouSongs.map((s) => s._id === updatedSong._id ? updatedSong : s),
            recentSongs: state.recentSongs.map((s) => s._id === updatedSong._id ? updatedSong : s),
            likedSongs: state.likedSongs.map((s) => s._id === updatedSong._id ? updatedSong : s),
        }));
    },

    search: async (query, signal) => {
        if (!query) {
            set({ searchResults: { songs: [], albums: [] } });
            return;
        }
        try {
            const response = await axiosInstance.get(`/songs/search?query=${encodeURIComponent(query)}`, { signal });
            set({ searchResults: response.data });
        } catch (error: any) {
            if (axios.isCancel?.(error) || error.name === "CanceledError") return;
            set({ error: error.response?.data?.message || error.message });
        }
    },
}));