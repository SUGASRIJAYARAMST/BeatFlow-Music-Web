import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import type { Announcement } from "../types";

interface AnnouncementStore {
    announcements: Announcement[];
    activeAnnouncements: Announcement[];
    isLoading: boolean;

    fetchAnnouncements: () => Promise<void>;
    fetchActiveAnnouncements: () => Promise<void>;
    createAnnouncement: (data: { title: string; content: string; type?: string; expiresAt?: string }) => Promise<void>;
    updateAnnouncement: (id: string, data: Partial<Announcement>) => Promise<void>;
    deleteAnnouncement: (id: string) => Promise<void>;
}

export const useAnnouncementStore = create<AnnouncementStore>((set) => ({
    announcements: [],
    activeAnnouncements: [],
    isLoading: false,

    fetchAnnouncements: async () => {
        set({ isLoading: true });
        try {
            const response = await axiosInstance.get("/admin/announcements");
            set({ announcements: response.data });
        } catch (error) {
            console.error("Failed to fetch announcements", error);
        } finally {
            set({ isLoading: false });
        }
    },

    fetchActiveAnnouncements: async () => {
        try {
            const response = await axiosInstance.get("/announcements/active");
            set({ activeAnnouncements: response.data });
        } catch (error) {
            console.error("Failed to fetch active announcements", error);
        }
    },

    createAnnouncement: async (data) => {
        set({ isLoading: true });
        try {
            const response = await axiosInstance.post("/admin/announcements", data);
            set((state) => ({ announcements: [response.data.announcement, ...state.announcements] }));
        } catch (error) {
            console.error("Failed to create announcement", error);
        } finally {
            set({ isLoading: false });
        }
    },

    updateAnnouncement: async (id, data) => {
        try {
            const response = await axiosInstance.put(`/admin/announcements/${id}`, data);
            set((state) => ({
                announcements: state.announcements.map((a) => a._id === id ? response.data.announcement : a)
            }));
        } catch (error) {
            console.error("Failed to update announcement", error);
        }
    },

    deleteAnnouncement: async (id) => {
        try {
            await axiosInstance.delete(`/admin/announcements/${id}`);
            set((state) => ({
                announcements: state.announcements.filter((a) => a._id !== id)
            }));
        } catch (error) {
            console.error("Failed to delete announcement", error);
        }
    },
}));