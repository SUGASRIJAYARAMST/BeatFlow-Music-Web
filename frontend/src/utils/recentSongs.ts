import type { Song } from "../types";

const RECENT_KEY = "beatflow_recent_songs";

export const getRecentSongs = (): Song[] => {
    try {
        const data = localStorage.getItem(RECENT_KEY);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
};

export const addRecentSong = (song: Song) => {
    try {
        const recent = getRecentSongs();
        const filtered = recent.filter((s: Song) => s._id !== song._id);
        const updated = [song, ...filtered].slice(0, 10);
        localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    } catch {}
};

export const clearRecentSongs = () => {
    localStorage.removeItem(RECENT_KEY);
};

export const removeRecentSong = (songId: string) => {
    try {
        const recent = getRecentSongs();
        const updated = recent.filter((s: Song) => s._id !== songId);
        localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    } catch {}
};
