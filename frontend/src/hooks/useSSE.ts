import { useUser } from "@clerk/react";
import { useNotificationStore } from "../stores/useNotificationStore";
import { useAuthStore } from "../stores/useAuthStore";
import { useEffect, useRef } from "react";
import { axiosInstance } from "../lib/axios";

export const useSSE = () => {
    const { user } = useUser();
    const { fetchNotifications } = useNotificationStore();
    const { isAdmin } = useAuthStore();
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    useEffect(() => {
        if (!user || !isAdmin) return;

        let eventSource: EventSource | null = null;
        let isCleaningUp = false;

        const getToken = async () => {
            if (window.Clerk?.session?.getToken) {
                return await window.Clerk.session.getToken();
            }
            return null;
        };

        const connectSSE = async () => {
            if (isCleaningUp) return;
            const token = await getToken();
            if (!token) return;

            eventSource = new EventSource(
                `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/sse/events?token=${token}`
            );

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.event === 'password-change-request' || data.event === 'pin-reset-request' ||
                        data.event === 'password-change-approved' || data.event === 'password-change-rejected' ||
                        data.event === 'pin-reset-approved' || data.event === 'pin-reset-rejected') {
                        fetchNotifications();
                    } else {
                        console.log('Unknown SSE event:', data.event);
                    }
                } catch (error) {
                    console.error('Error parsing SSE event:', error);
                }
            };

            eventSource.onerror = () => {
                eventSource?.close();
                eventSource = null;
                if (!isCleaningUp) {
                    reconnectTimeoutRef.current = setTimeout(connectSSE, 5000);
                }
            };
        };

        connectSSE();

        return () => {
            isCleaningUp = true;
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            eventSource?.close();
            eventSource = null;
        };
    }, [user, fetchNotifications, isAdmin]);

    useEffect(() => {
        if (!user || !isAdmin) return;

        const interval = setInterval(() => {
            fetchNotifications();
        }, 10000);
        return () => clearInterval(interval);
    }, [user, isAdmin, fetchNotifications]);
};