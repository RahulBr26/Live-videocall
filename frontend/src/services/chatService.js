import api from "./api";

export const chatService = {
  getMyChats: () => api.get("/chats").then((r) => r.data),
  getChatById: (chatId) => api.get(`/chats/${chatId}`).then((r) => r.data),
  accessOneToOne: (userId) => api.post("/chats/one-to-one", { userId }).then((r) => r.data),

  searchUsers: (q) => api.get("/users/search", { params: { q } }).then((r) => r.data),

  createGroup: (payload) => api.post("/groups", payload).then((r) => r.data),
  editGroup: (groupId, payload) => api.patch(`/groups/${groupId}`, payload).then((r) => r.data),
  deleteGroup: (groupId) => api.delete(`/groups/${groupId}`).then((r) => r.data),
  addMembers: (groupId, userIds) =>
    api.post(`/groups/${groupId}/members`, { userIds }).then((r) => r.data),
  removeMember: (groupId, userId) =>
    api.delete(`/groups/${groupId}/members/${userId}`).then((r) => r.data),
  promoteAdmin: (groupId, userId) =>
    api.post(`/groups/${groupId}/admins/${userId}`).then((r) => r.data),
  leaveGroup: (groupId) => api.post(`/groups/${groupId}/leave`).then((r) => r.data),
};
