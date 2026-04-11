import axios from "axios";

declare global {
    interface Window {
        Clerk?: any;
    }
}

export const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
    withCredentials: true,
});


// Request interceptor to add the bearer token automatically
axiosInstance.interceptors.request.use(async (config) => {
    // Add token to ALL requests, including FormData (file uploads)
    if (window.Clerk?.session?.getToken) {
        try {
            const token = await window.Clerk.session.getToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.error("Error getting auth token:", error);
        }
    }
    return config;
});