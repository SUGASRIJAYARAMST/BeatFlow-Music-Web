import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { usePlayerStore } from "./usePlayerStore";
import { useAuthStore } from "./useAuthStore";

type Plan = "daily" | "monthly" | "yearly";

interface OrderResult {
    paymentSessionId?: string;
    orderId: string;
    testMode?: boolean;
}

interface SubscriptionStore {
    isLoading: boolean;
    error: string | null;
    isPremium: boolean;
    subscriptionPlan: string;
    subscriptionExpiry: string | null;
    expiryTimestamp: number | null;
    initialized: boolean;

    createOrder: (plan: Plan) => Promise<OrderResult | null>;
    verifyPayment: (orderId: string) => Promise<boolean>;
    checkSubscription: () => Promise<void>;
    refreshSubscription: () => Promise<void>;
}

let checkSubPromise: Promise<void> | null = null;

const SUB_STORAGE_KEY = "beatflow_sub_state";

const loadPersistedSub = () => {
    try {
        const data = localStorage.getItem(SUB_STORAGE_KEY);
        if (data) return JSON.parse(data);
    } catch {}
    return { isPremium: false, subscriptionPlan: "none", subscriptionExpiry: null, expiryTimestamp: null };
};

const savePersistedSub = (state: { isPremium: boolean; subscriptionPlan: string; subscriptionExpiry: string | null; expiryTimestamp: number | null }) => {
    try {
        localStorage.setItem(SUB_STORAGE_KEY, JSON.stringify(state));
    } catch {}
};

const persisted = loadPersistedSub();

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
    isLoading: false,
    error: null,
    isPremium: persisted.isPremium ?? false,
    subscriptionPlan: persisted.subscriptionPlan || "none",
    subscriptionExpiry: persisted.subscriptionExpiry || null,
    expiryTimestamp: persisted.expiryTimestamp || null,
    initialized: false,

    createOrder: async (plan) => {
        set({ isLoading: true, error: null });
        try {
            const response = await axiosInstance.post("/payments/create-order", { plan });
            return {
                paymentSessionId: response.data.paymentSessionId,
                orderId: response.data.orderId,
                testMode: response.data.testMode
            };
        } catch (error: any) {
            set({ error: error.response?.data?.message || error.message });
            toast.error(error.response?.data?.message || "Payment failed");
            return null;
        } finally {
            set({ isLoading: false });
        }
    },

    verifyPayment: async (orderId) => {
        set({ isLoading: true, error: null });
        try {
            const response = await axiosInstance.post("/payments/verify", { orderId });
            if (response.data.success) {
                toast.success("Subscription activated successfully!");
                const expiryMs = response.data.expiryTimestamp;
                set({ 
                    isPremium: true, 
                    subscriptionPlan: response.data.plan || "monthly",
                    expiryTimestamp: expiryMs,
                    subscriptionExpiry: expiryMs ? new Date(expiryMs).toISOString() : null
                });
                const { setPremiumStatus } = usePlayerStore.getState();
                const { user } = useAuthStore.getState();
                setPremiumStatus(true, user?.role || null);
            }
            return response.data.success;
        } catch (error: any) {
            set({ error: error.response?.data?.message || error.message });
            toast.error(error.response?.data?.message || "Verification failed");
            return false;
        } finally {
            set({ isLoading: false });
        }
    },

    checkSubscription: async () => {
        if (checkSubPromise) return checkSubPromise;

        checkSubPromise = (async () => {
            try {
                const response = await axiosInstance.get("/payments/check-subscription");
                const expiryMs = response.data.expiryTimestamp;
                const subState = {
                    isPremium: response.data.isPremium,
                    subscriptionPlan: response.data.subscriptionPlan,
                    subscriptionExpiry: response.data.subscriptionExpiry,
                    expiryTimestamp: expiryMs,
                };
                set(subState);
                savePersistedSub(subState);
                const { setPremiumStatus } = usePlayerStore.getState();
                const { user } = useAuthStore.getState();
                setPremiumStatus(response.data.isPremium, user?.role || null);
            } catch (error: any) {
                console.error("Subscription check error:", error);
            } finally {
                checkSubPromise = null;
            }
        })();

        return checkSubPromise;
    },

    refreshSubscription: async () => {
        try {
            const response = await axiosInstance.get("/payments/check-subscription");
            const expiryMs = response.data.expiryTimestamp;
            set({
                isPremium: response.data.isPremium,
                subscriptionPlan: response.data.subscriptionPlan,
                subscriptionExpiry: response.data.subscriptionExpiry,
                expiryTimestamp: expiryMs,
                initialized: true,
            });
        } catch (error: any) {
            set({ error: error.response?.data?.message || error.message });
        }
    },
}));