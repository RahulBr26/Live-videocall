import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "https://live-video-chat-jsoe.onrender.com";

let socket = null;

/**
 * Creates (or returns the existing) Socket.IO connection, authenticated
 * with the current access token. Call disconnectSocket() on logout so a
 * stale-token socket doesn't linger.
 */
export const connectSocket = (accessToken) => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    withCredentials: true,
    transports: ["websocket", "polling"],
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
