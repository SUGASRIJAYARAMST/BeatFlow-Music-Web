import type { Song } from "../types";

const RECENT_KEY_PREFIX = "beatflow_recent_songs_";

const getKey = (userId: string | null) => {
    return userId ? `${RECENT_KEY_PREFIX}${userId}` : RECENT_KEY_PREFIX;
};

export const getRecentSongs = (userId: string | null = null): Song[] => {
    try {
        const data = localStorage.getItem(getKey(userId));
        return data ? JSON.parse(data) : [];
    } catch { return []; }
};

export const addRecentSong = (song: Song, userId: string | null = null) => {
    try {
        const recent = getRecentSongs(userId);
        const filtered = recent.filter((s: Song) => s._id !== song._id);
        const updated = [song, ...filtered].slice(0, 10);
        localStorage.setItem(getKey(userId), JSON.stringify(updated));
    } catch {}
};

export const clearRecentSongs = (userId: string | null = null) => {
    localStorage.removeItem(getKey(userId));
};

export const removeRecentSong = (songId: string, userId: string | null = null) => {
    try {
        const recent = getRecentSongs(userId);
        const updated = recent.filter((s: Song) => s._id !== songId);
        localStorage.setItem(getKey(userId), JSON.stringify(updated));
    } catch {}
};
