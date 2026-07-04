import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { authService } from "../services/authService";
import { connectSocket } from "../services/socket";

/**
 * On first mount, tries POST /auth/refresh (relying on the httpOnly cookie)
 * to silently restore a session after a hard page reload, since the access
 * token itself is kept only in memory. If it succeeds, fetches the fresh
 * user profile and opens the Socket.IO connection.
 */
export const useAuthBootstrap = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!useAuthStore.getState().user) {
        logout();
        return;
      }

      try {
        const { accessToken } = await authService.refresh();
        if (cancelled) return;

        useAuthStore.getState().setAccessToken(accessToken);
        const { user } = await authService.getMe();
        if (cancelled) return;

        setAuth(user, accessToken);
        connectSocket(accessToken);
      } catch {
        if (!cancelled) logout();
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
