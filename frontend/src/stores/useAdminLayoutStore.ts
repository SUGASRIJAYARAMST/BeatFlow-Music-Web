import { create } from "zustand";

interface PinRequest {
  _id: string;
  fullName: string;
  email: string;
  createdAt: string;
  status: string;
}

interface PasswordRequest {
  _id: string;
  fullName: string;
  email: string;
  createdAt: string;
  status: string;
}

interface AdminLayoutStore {
  pinRequests: PinRequest[];
  setPinRequests: (requests: PinRequest[]) => void;
  passwordRequests: PasswordRequest[];
  setPasswordRequests: (requests: PasswordRequest[]) => void;
}

export const useAdminLayoutStore = create<AdminLayoutStore>((set) => ({
  pinRequests: [],
  setPinRequests: (requests) => set({ pinRequests: requests }),
  passwordRequests: [],
  setPasswordRequests: (requests) => set({ passwordRequests: requests })
}));