import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Auth state. The access token is deliberately NOT persisted to
 * localStorage (to reduce XSS token-theft surface) -- on a hard refresh
 * the app calls POST /api/auth/refresh using the httpOnly cookie to get a
 * fresh one (see useAuthBootstrap hook). Only the user profile is persisted
 * for a smoother initial paint.
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthLoading: true, // true until bootstrap (refresh-on-load) completes

      setAuth: (user, accessToken) => set({ user, accessToken, isAuthLoading: false }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      setAuthLoading: (isAuthLoading) => set({ isAuthLoading }),
      logout: () => set({ user: null, accessToken: null, isAuthLoading: false }),
    }),
    {
      name: "chatapp-auth",
      partialize: (state) => ({ user: state.user }), // only persist `user`, not the token
    }
  )
);
