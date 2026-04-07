import { create } from "zustand";
import type { Song } from "../types";
import toast from "react-hot-toast";
import { addRecentSong, getRecentSongs } from "../utils/recentSongs";

const PLAYER_STORAGE_KEY = "beatflow_player_state";

interface PersistedState {
    currentSong: Song | null;
    queue: Song[];
    currentIndex: number;
    isPlaying: boolean;
    isShuffle: boolean;
    repeatMode: "none" | "one" | "all";
    volume: number;
    currentTime: number;
    duration: number;
    songsPlayedSinceLastAd: number;
}

const loadPersistedState = (): Partial<PersistedState> => {
    try {
        const data = localStorage.getItem(PLAYER_STORAGE_KEY);
        if (data) return JSON.parse(data);
    } catch {}
    return {};
};

const savePersistedState = (state: PersistedState) => {
    try {
        localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify({
            currentSong: state.currentSong,
            queue: state.queue,
            currentIndex: state.currentIndex,
            isPlaying: state.isPlaying,
            isShuffle: state.isShuffle,
            repeatMode: state.repeatMode,
            volume: state.volume,
            currentTime: state.currentTime,
            duration: state.duration,
        }));
    } catch {}
};

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const debouncedSave = (state: PersistedState) => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => savePersistedState(state), 1000);
};

const persisted = loadPersistedState();

interface PlayerStore {
    currentSong: Song | null;
    isPlaying: boolean;
    queue: Song[];
    currentIndex: number;
    isShuffle: boolean;
    repeatMode: "none" | "one" | "all";
    hasRepeatedOnce: boolean;
    isPremium: boolean;
    userRole: string | null;
    userId: string | null;
    volume: number;
    isMuted: boolean;
    currentTime: number;
    duration: number;
    songsPlayedSinceLastAd: number;
    shouldShowAd: boolean;
    recentSongs: Song[];

    setPremiumStatus: (isPremium: boolean, userRole: string | null) => void;
    setUserId: (userId: string | null) => void;
    playAlbum: (songs: Song[], startIndex?: number) => void;
    setQueueAndPlay: (songs: Song[], startIndex?: number) => void;
    setCurrentSong: (song: Song | null) => void;
    togglePlay: () => void;
    playNext: () => void;
    playPrevious: () => void;
    toggleShuffle: () => void;
    toggleRepeatMode: () => void;
    setVolume: (volume: number) => void;
    toggleMute: () => void;
    setIsPlaying: (playing: boolean) => void;
    seekTo: (time: number) => void;
    setCurrentTime: (time: number) => void;
    setDuration: (time: number) => void;
    incrementAdCounter: () => void;
    resetAdCounter: () => void;
    dismissAd: () => void;
    refreshRecentSongs: () => void;
}

const checkAccess = (song: Song, isPremium: boolean, userRole: string | null): boolean => {
    if (!song.isPremium) return true;
    if (isPremium || userRole === "admin") return true;
    return false;
};

export const usePlayerStore = create<PlayerStore>((set, get) => ({
    currentSong: persisted.currentSong || null,
    isPlaying: false,
    queue: persisted.queue || [],
    currentIndex: persisted.currentIndex ?? -1,
    isShuffle: persisted.isShuffle ?? false,
    repeatMode: persisted.repeatMode || "none",
    hasRepeatedOnce: false,
    isPremium: false,
    userRole: null,
    userId: null,
    volume: persisted.volume ?? 0.7,
    isMuted: false,
    currentTime: persisted.currentTime ?? 0,
    duration: 0,
    songsPlayedSinceLastAd: 0,
    shouldShowAd: false,
    recentSongs: getRecentSongs(),

    setPremiumStatus: (isPremium, userRole) => set({ isPremium, userRole }),
    setUserId: (userId) => {
        set({ userId, recentSongs: getRecentSongs(userId) });
    },

    playAlbum: (songs: Song[], startIndex = 0) => {
        if (songs.length === 0) return;
        const { isPremium, userRole, userId } = get();
        const song = songs[startIndex];
        if (song.isPremium && !checkAccess(song, isPremium, userRole)) {
            toast.error("Pro subscription required");
            return;
        }
        addRecentSong(song, userId);
        set({
            queue: songs,
            currentSong: song,
            currentIndex: startIndex,
            isPlaying: true,
            hasRepeatedOnce: false,
            recentSongs: getRecentSongs(userId),
        });
        debouncedSave({ ...get(), isPlaying: true, hasRepeatedOnce: false } as PersistedState);
    },

    setQueueAndPlay: (songs: Song[], startIndex = 0) => {
        if (songs.length === 0) return;
        const song = songs[startIndex];
        set({
            queue: songs,
            currentSong: song,
            currentIndex: startIndex,
            isPlaying: true,
            hasRepeatedOnce: false,
        });
        debouncedSave({ ...get(), isPlaying: true, hasRepeatedOnce: false } as PersistedState);
    },

    setCurrentSong: (song: Song | null) => {
        if (!song) return;
        const { isPremium, userRole, songsPlayedSinceLastAd, userId } = get();
        const songIndex = get().queue.findIndex((s) => s._id === song._id);
        addRecentSong(song, userId);

        if (!isPremium && userRole !== "admin") {
            const newCount = songsPlayedSinceLastAd + 1;
            if (newCount >= 4) {
                set({ shouldShowAd: true, isPlaying: false });
                debouncedSave({ ...get() } as PersistedState);
                return;
            }
            set({ songsPlayedSinceLastAd: newCount });
        }

        set({
            currentSong: song,
            isPlaying: true,
            currentIndex: songIndex !== -1 ? songIndex : get().currentIndex,
            currentTime: 0,
            recentSongs: getRecentSongs(userId),
        });
        debouncedSave({ ...get() } as PersistedState);
    },

    togglePlay: () => {
        const { isPlaying, currentSong, queue, currentIndex, repeatMode } = get();
        const next = !isPlaying;

        if (next && currentSong && queue.length > 0) {
            const isLastSong = currentIndex === queue.length - 1;
            const isQueueEnded = isLastSong && repeatMode === "none";
            if (isQueueEnded) {
                const firstSong = queue[0];
                set({ currentSong: firstSong, currentIndex: 0, isPlaying: true, currentTime: 0 });
                debouncedSave({ ...get() } as PersistedState);
                return;
            }
        }

        set({ isPlaying: next });
        debouncedSave({ ...get() } as PersistedState);
    },

    playNext: () => {
        const { currentIndex, queue, isShuffle, repeatMode, isPremium, userRole, songsPlayedSinceLastAd, currentSong, userId } = get();
        if (queue.length === 0) return;

        if (repeatMode === "one") {
            if (!isPremium && userRole !== "admin") {
                const newCount = songsPlayedSinceLastAd + 1;
                if (newCount >= 4) {
                    set({ shouldShowAd: true, isPlaying: false });
                    return;
                }
                set({ songsPlayedSinceLastAd: newCount });
            }
            set({ currentTime: 0, isPlaying: true });
            debouncedSave({ ...get() } as PersistedState);
            return;
        }

        let nextIndex = currentIndex + 1;
        if (isShuffle) {
            nextIndex = Math.floor(Math.random() * queue.length);
            while (nextIndex === currentIndex && queue.length > 1) {
                nextIndex = Math.floor(Math.random() * queue.length);
            }
        }

        if (nextIndex >= queue.length && queue.length === 1) {
            set({ isPlaying: false });
            debouncedSave({ ...get() } as PersistedState);
            return;
        }

        if (!isPremium && userRole !== "admin") {
            const newCount = songsPlayedSinceLastAd + 1;
            if (newCount >= 4) {
                set({ shouldShowAd: true, isPlaying: false });
                debouncedSave({ ...get() } as PersistedState);
                return;
            }
            set({ songsPlayedSinceLastAd: newCount });
        }

        if (nextIndex < queue.length) {
            if (!checkAccess(queue[nextIndex], isPremium, userRole)) {
                const freeSongs = queue.map((s, i) => ({ song: s, index: i })).filter(({ song }) => checkAccess(song, isPremium, userRole));
                if (freeSongs.length === 0) {
                    toast.error("No free songs available");
                    set({ isPlaying: false });
                    return;
                }
                const next = freeSongs[Math.floor(Math.random() * freeSongs.length)];
                addRecentSong(next.song, userId);
                set({ currentSong: next.song, currentIndex: next.index, isPlaying: true, currentTime: 0, recentSongs: getRecentSongs(userId) });
            } else {
                addRecentSong(queue[nextIndex], userId);
                set({ currentSong: queue[nextIndex], currentIndex: nextIndex, isPlaying: true, currentTime: 0, recentSongs: getRecentSongs(userId) });
            }
        } else if (repeatMode === "all") {
            addRecentSong(queue[0], userId);
            set({ currentSong: queue[0], currentIndex: 0, isPlaying: true, currentTime: 0, recentSongs: getRecentSongs(userId) });
        } else {
            set({ isPlaying: false });
        }
        debouncedSave({ ...get() } as PersistedState);
    },

    playPrevious: () => {
        const { currentIndex, queue, isShuffle, currentTime, repeatMode, isPremium, userRole, songsPlayedSinceLastAd, userId } = get();
        if (currentTime > 3) {
            set({ currentTime: 0 });
            debouncedSave({ ...get() } as PersistedState);
            return;
        }

        let prevIndex = currentIndex - 1;
        if (isShuffle) {
            prevIndex = Math.floor(Math.random() * queue.length);
        }

        if (!isPremium && userRole !== "admin") {
            const newCount = songsPlayedSinceLastAd + 1;
            if (newCount >= 4) {
                set({ shouldShowAd: true, isPlaying: false });
                debouncedSave({ ...get() } as PersistedState);
                return;
            }
            set({ songsPlayedSinceLastAd: newCount });
        }

        if (prevIndex >= 0) {
            if (!checkAccess(queue[prevIndex], isPremium, userRole)) {
                const freeSongs = queue.map((s, i) => ({ song: s, index: i })).filter(({ song }) => checkAccess(song, isPremium, userRole));
                if (freeSongs.length === 0) {
                    toast.error("No free songs available");
                    return;
                }
                const prev = freeSongs[Math.floor(Math.random() * freeSongs.length)];
                addRecentSong(prev.song, userId);
                set({ currentSong: prev.song, currentIndex: prev.index, isPlaying: true, currentTime: 0, recentSongs: getRecentSongs(userId) });
            } else {
                addRecentSong(queue[prevIndex], userId);
                set({ currentSong: queue[prevIndex], currentIndex: prevIndex, isPlaying: true, currentTime: 0, recentSongs: getRecentSongs(userId) });
            }
        } else if (repeatMode === "all" && queue.length > 0) {
            addRecentSong(queue[queue.length - 1], userId);
            set({ currentSong: queue[queue.length - 1], currentIndex: queue.length - 1, isPlaying: true, currentTime: 0, recentSongs: getRecentSongs(userId) });
        } else {
            set({ currentTime: 0 });
        }
        debouncedSave({ ...get() } as PersistedState);
    },

    toggleShuffle: () => {
        const newShuffle = !get().isShuffle;
        set({
            isShuffle: newShuffle,
            repeatMode: newShuffle ? "none" : get().repeatMode
        });
        debouncedSave({ ...get() } as PersistedState);
    },

    toggleRepeatMode: () => {
        const currentMode = get().repeatMode;
        const nextMode = currentMode === "none" ? "one" : currentMode === "one" ? "all" : "none";

        set({
            repeatMode: nextMode,
            isShuffle: nextMode !== "none" ? false : get().isShuffle,
            hasRepeatedOnce: false,
        });
        debouncedSave({ ...get() } as PersistedState);
    },
    setVolume: (vol) => {
        set({ volume: vol, isMuted: vol === 0 });
        debouncedSave({ ...get() } as PersistedState);
    },
    toggleMute: () => {
        set((state) => ({ isMuted: !state.isMuted }));
        debouncedSave({ ...get() } as PersistedState);
    },
    setIsPlaying: (playing) => {
        set({ isPlaying: playing });
        debouncedSave({ ...get() } as PersistedState);
    },
    seekTo: (time) => {
        set({ currentTime: time });
        debouncedSave({ ...get() } as PersistedState);
    },
    setCurrentTime: (time) => set({ currentTime: time }),
    setDuration: (time) => set({ duration: time }),
    incrementAdCounter: () => {
        const { songsPlayedSinceLastAd } = get();
        set({ songsPlayedSinceLastAd: songsPlayedSinceLastAd + 1 });
    },
    resetAdCounter: () => set({ songsPlayedSinceLastAd: 0, shouldShowAd: false }),
    dismissAd: () => set({ shouldShowAd: false }),
    refreshRecentSongs: () => {
        const { userId } = get();
        set({ recentSongs: getRecentSongs(userId) });
    },
}));
