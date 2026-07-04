import api from "./api";

export const messageService = {
  getMessages: (chatId, page = 1, limit = 30) =>
    api.get(`/messages/${chatId}`, { params: { page, limit } }).then((r) => r.data),
  searchMessages: (chatId, q) =>
    api.get(`/messages/${chatId}/search`, { params: { q } }).then((r) => r.data),
  editMessage: (messageId, content) =>
    api.patch(`/messages/${messageId}`, { content }).then((r) => r.data),
  deleteMessage: (messageId) => api.delete(`/messages/${messageId}`).then((r) => r.data),
  toggleReaction: (messageId, emoji) =>
    api.post(`/messages/${messageId}/reactions`, { emoji }).then((r) => r.data),
  togglePin: (messageId) => api.post(`/messages/${messageId}/pin`).then((r) => r.data),
  toggleStar: (messageId) => api.post(`/messages/${messageId}/star`).then((r) => r.data),

  uploadAttachment: (chatId, file, onProgress) => {
    const formData = new FormData();
    formData.append("file", file);
    return api
      .post(`/uploads/chat/${chatId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
        },
      })
      .then((r) => r.data);
  },

  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return api
      .post("/uploads/avatar", formData, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data);
  },
};
