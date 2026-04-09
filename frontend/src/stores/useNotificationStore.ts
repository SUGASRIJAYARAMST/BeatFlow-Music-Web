import { create } from "zustand";
import { persist } from "zustand/middleware";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

interface Notification {
    id: string;
    title: string;
    message: string;
    type: "success" | "error" | "info" | "warning";
    read: boolean;
    createdAt: string;
}

interface NotificationStore {
    notifications: Notification[];
    enabled: boolean;
    isLoading: boolean;
    fetchNotifications: () => Promise<void>;
    addNotification: (message: string, type?: "success" | "error" | "info" | "warning", title?: string, showToast?: boolean) => void;
    addServerNotification: (notification: Notification) => void;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    clearNotifications: () => void;
    removeNotification: (id: string) => Promise<void>;
    setEnabled: (enabled: boolean) => void;
}

export const useNotificationStore = create<NotificationStore>()(
    persist(
        (set, get) => ({
            notifications: [],
            enabled: true,
            isLoading: false,

            fetchNotifications: async () => {
                if (!get().enabled) return;
                set({ isLoading: true });
                try {
                    const res = await axiosInstance.get("/notifications");
                    const serverNotifications = res.data.map((n: any) => ({
                        id: n._id,
                        title: n.title,
                        message: n.message,
                        type: n.type,
                        read: n.read,
                        createdAt: n.createdAt,
                    }));
                    set({ notifications: serverNotifications });
                } catch (error) {
                    console.error("Failed to fetch notifications", error);
                } finally {
                    set({ isLoading: false });
                }
            },

            addNotification: async (message, type = "info", title = "Notification", showToast = true) => {
                if (!get().enabled) return;
                const notification: Notification = {
                    id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                    title,
                    message,
                    type,
                    read: false,
                    createdAt: new Date().toISOString(),
                };
                set((state) => ({
                    notifications: [notification, ...state.notifications].slice(0, 50),
                }));
                if (showToast) {
                    if (type === "success") toast.success(message);
                    else if (type === "error") toast.error(message);
                    else if (type === "warning") toast(message, { icon: "⚠️" });
                    else toast(message);
                }
                try {
                    await axiosInstance.post("/notifications", { title, message, type });
                } catch {
                    // saved locally, server sync failed
                }
            },

            addServerNotification: (notification: Notification) => {
                set((state) => ({
                    notifications: [notification, ...state.notifications].slice(0, 50),
                }));
                if (notification.type === "success") toast.success(notification.message);
                else if (notification.type === "error") toast.error(notification.message);
                else toast(notification.message);
            },

            markAsRead: async (id) => {
                try {
                    await axiosInstance.put(`/notifications/${id}/read`);
                    set((state) => ({
                        notifications: state.notifications.map((n) =>
                            n.id === id ? { ...n, read: true } : n
                        ),
                    }));
                } catch (error) {
                    console.error("Failed to mark notification as read", error);
                }
            },

            markAllAsRead: async () => {
                try {
                    await axiosInstance.put("/notifications/read-all");
                    set((state) => ({
                        notifications: state.notifications.map((n) => ({ ...n, read: true })),
                    }));
                } catch (error) {
                    console.error("Failed to mark all notifications as read", error);
                }
            },

            clearNotifications: async () => {
                try {
                    await axiosInstance.delete("/notifications/clear-all");
                    set({ notifications: [] });
                } catch (error) {
                    console.error("Failed to clear notifications", error);
                    set({ notifications: [] });
                }
            },

            removeNotification: async (id) => {
                try {
                    await axiosInstance.delete(`/notifications/${id}`);
                    set((state) => ({
                        notifications: state.notifications.filter((n) => n.id !== id),
                    }));
                } catch (error) {
                    console.error("Failed to delete notification", error);
                }
            },

            setEnabled: (enabled) => {
                set({ enabled });
                if (enabled) {
                    get().fetchNotifications();
                }
            },
        }),
        {
            name: "beatflow-notifications",
        }
    )
);
