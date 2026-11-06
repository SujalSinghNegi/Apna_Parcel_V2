import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthUser } from "@/types";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  setAuth: (user: AuthUser, accessToken: string | null, refreshToken: string | null) => void;
  setUser: (user: AuthUser) => void;
  clearAuth: () => void;
  setLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,

      // Firebase and Zustand 'persist' handle storage automatically now
      setAuth: (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken }),
      
      setUser: (user) => set({ user }),
      
      clearAuth: () => set({ user: null, accessToken: null, refreshToken: null }),
      
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: "apnaparcel-auth",
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
      }),
    }
  )
);