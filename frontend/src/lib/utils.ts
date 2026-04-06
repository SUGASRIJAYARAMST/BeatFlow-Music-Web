import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
};

export const GENRES = ["Pop", "Rock", "Hip-Hop", "Electronic", "Jazz", "Classical", "R&B", "Country", "Indie", "Metal", "Other"] as const;

export const optimizeImage = (url: string, size: "sm" | "md" | "lg" | "full" = "md"): string => {
    if (!url || !url.includes("cloudinary")) return url;
    const dims = { sm: 96, md: 300, lg: 600, full: 0 };
    const d = dims[size];
    if (d === 0) return url;
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}w=${d}&h=${d}&c=fill&q=80&f=auto`;
};