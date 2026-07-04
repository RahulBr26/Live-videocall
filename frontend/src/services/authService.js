import api from "./api";

export const authService = {
  register: (payload) => api.post("/auth/register", payload).then((r) => r.data),
  login: (payload) => api.post("/auth/login", payload).then((r) => r.data),
  googleLogin: (idToken) => api.post("/auth/google", { idToken }).then((r) => r.data),
  logout: () => api.post("/auth/logout").then((r) => r.data),
  refresh: () => api.post("/auth/refresh").then((r) => r.data),
  verifyEmail: (token) => api.post("/auth/verify-email", { token }).then((r) => r.data),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }).then((r) => r.data),
  resetPassword: (token, newPassword) =>
    api.post("/auth/reset-password", { token, newPassword }).then((r) => r.data),
  getMe: () => api.get("/auth/me").then((r) => r.data),
};
