export interface Song {
    _id: string;
    title: string;
    artist: string;
    genre: string;
    albumId: string | null;
    albumTitle?: string;
    imageUrl: string;
    audioUrl: string;
    duration: number;
    isFeatured: boolean;
    isTrending: boolean;
    isPremium: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Album {
    _id: string;
    title: string;
    artist: string;
    genre: string;
    imageUrl: string;
    releaseYear: number;
    songs: Song[];
    isPremium: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Playlist {
    _id: string;
    name: string;
    description: string;
    imageUrl: string;
    creatorId: string;
    songs: { song: Song; addedAt: string }[];
    isPublic: boolean;
    organizationType: "list" | "tree" | "genre" | "artist";
    createdAt: string;
    updatedAt: string;
}

export interface User {
    _id: string;
    clerkId: string;
    fullName: string;
    imageUrl: string;
    isPremium: boolean;
    subscriptionPlan: "none" | "daily" | "monthly" | "yearly";
    subscriptionExpiry: string | null;
    notifications: boolean;
    role: "user" | "admin";
    createdAt: string;
    updatedAt: string;
}

export interface Announcement {
    _id: string;
    title: string;
    content: string;
    type: "info" | "update" | "maintenance" | "promotion";
    isActive: boolean;
    expiresAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Payment {
    _id: string;
    userId: string;
    clerkId: string;
    plan: "daily" | "monthly" | "yearly";
    amount: number;
    currency: string;
    cashfreeOrderId: string;
    cashfreePaymentId: string;
    status: "pending" | "success" | "failed";
    subscriptionStart: string | null;
    subscriptionEnd: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Stats {
    totalSongs: number;
    totalAlbums: number;
    totalUsers: number;
    totalPremium: number;
    totalPlaylists: number;
    totalRevenue: number;
    recentPayments: Payment[];
}