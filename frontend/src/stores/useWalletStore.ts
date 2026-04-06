import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

interface WalletStore {
    balance: number;
    transactions: any[];
    isLoading: boolean;
    error: string | null;
    hasPin: boolean;

    fetchWallet: () => Promise<void>;
    fetchPinStatus: () => Promise<boolean>;
    setPin: (pin: string) => Promise<boolean>;
    verifyPin: (pin: string) => Promise<{ verified: boolean; needsSetup: boolean }>;
    addMoney: (amount: number) => Promise<boolean>;
    payFromWallet: (plan: string) => Promise<boolean>;
    withdraw: (amount: number) => Promise<boolean>;
    clearTransactions: () => Promise<boolean>;
    syncPastPayments: () => Promise<{ synced: number; amount: number }>;
}

export const useWalletStore = create<WalletStore>((set, get) => ({
    balance: 0,
    transactions: [],
    isLoading: false,
    error: null,
    hasPin: false,

    fetchWallet: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await axiosInstance.get("/wallet");
            set({
                balance: response.data.balance,
                transactions: response.data.transactions || [],
                isLoading: false
            });
        } catch (error: any) {
            set({ error: error.response?.data?.message || error.message, isLoading: false });
        }
    },

    fetchPinStatus: async () => {
        try {
            const response = await axiosInstance.get("/users/pin-status");
            set({ hasPin: response.data.hasPin, isLoading: false });
            return response.data.hasPin;
        } catch (error: any) {
            set({ hasPin: false, isLoading: false });
            return false;
        }
    },

    setPin: async (pin: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await axiosInstance.post("/users/wallet-pin", { pin });
            set({ hasPin: true, isLoading: false });
            toast.success(response.data.message);
            return true;
        } catch (error: any) {
            set({ error: error.response?.data?.message || error.message, isLoading: false });
            toast.error(error.response?.data?.message || "Failed to set PIN");
            return false;
        }
    },

    verifyPin: async (pin: string) => {
        try {
            const response = await axiosInstance.post("/users/verify-pin", { pin });
            return { verified: response.data.verified, needsSetup: false };
        } catch (error: any) {
            if (error.response?.data?.needsSetup) {
                return { verified: false, needsSetup: true };
            }
            return { verified: false, needsSetup: false };
        }
    },

    addMoney: async (amount: number) => {
        set({ isLoading: true, error: null });
        try {
            const response = await axiosInstance.post("/wallet/add-money", { amount });
            set({ balance: response.data.balance, isLoading: false });
            toast.success(response.data.message);
            return true;
        } catch (error: any) {
            set({ error: error.response?.data?.message || error.message, isLoading: false });
            toast.error(error.response?.data?.message || "Failed to add money");
            return false;
        }
    },

    payFromWallet: async (plan: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await axiosInstance.post("/wallet/pay", { plan });
            set({ balance: response.data.balance, isLoading: false });
            return true;
        } catch (error: any) {
            set({ error: error.response?.data?.message || error.message, isLoading: false });
            toast.error(error.response?.data?.message || "Payment failed");
            return false;
        }
    },

    withdraw: async (amount: number) => {
        set({ isLoading: true, error: null });
        try {
            const response = await axiosInstance.post("/wallet/withdraw", { amount });
            set({ balance: response.data.balance, isLoading: false });
            toast.success(response.data.message);
            return true;
        } catch (error: any) {
            set({ error: error.response?.data?.message || error.message, isLoading: false });
            toast.error(error.response?.data?.message || "Withdrawal failed");
            return false;
        }
    },

    clearTransactions: async () => {
        set({ isLoading: true, error: null });
        try {
            await axiosInstance.post("/wallet/clear-transactions");
            set({ transactions: [], isLoading: false });
            toast.success("All transactions cleared");
            return true;
        } catch (error: any) {
            set({ error: error.response?.data?.message || error.message, isLoading: false });
            toast.error(error.response?.data?.message || "Failed to clear transactions");
            return false;
        }
    },

    syncPastPayments: async () => {
        try {
            const response = await axiosInstance.post("/wallet/sync-payments");
            if (response.data.syncedCount > 0) {
                await get().fetchWallet();
            }
            return { synced: response.data.syncedCount, amount: response.data.amount };
        } catch (error: any) {
            return { synced: 0, amount: 0 };
        }
    }
}));
