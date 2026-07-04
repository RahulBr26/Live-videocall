import { create } from "zustand";

const dedupeMessages = (messages) => {
  const seen = new Set();

  return messages.filter((message) => {
    if (!message?._id) return true;
    if (seen.has(message._id)) return false;

    seen.add(message._id);
    return true;
  });
};

export const useChatStore = create((set, get) => ({
  chats: [],
  activeChatId: null,
  messagesByChat: {},
  typingByChat: {},
  onlineUserIds: new Set(),

  setChats: (chats) => set({ chats }),

  upsertChat: (chat) =>
    set((state) => {
      const exists = state.chats.some((c) => c._id === chat._id);
      const chats = exists
        ? state.chats.map((c) => (c._id === chat._id ? { ...c, ...chat } : c))
        : [chat, ...state.chats];

      return { chats };
    }),

  setActiveChatId: (chatId) => set({ activeChatId: chatId }),

  setMessagesForChat: (chatId, messages) =>
    set((state) => ({
      messagesByChat: {
        ...state.messagesByChat,
        [chatId]: dedupeMessages(messages),
      },
    })),

  prependMessages: (chatId, olderMessages) =>
    set((state) => ({
      messagesByChat: {
        ...state.messagesByChat,
        [chatId]: dedupeMessages([
          ...olderMessages,
          ...(state.messagesByChat[chatId] || []),
        ]),
      },
    })),

  addMessage: (chatId, message) =>
    set((state) => {
      const existing = state.messagesByChat[chatId] || [];

      if (existing.some((m) => m._id === message._id)) return state;

      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: [...existing, message],
        },
      };
    }),

  updateMessage: (chatId, messageId, updates) =>
    set((state) => {
      const messages = state.messagesByChat[chatId] || [];

      const updatedMessages = messages.map((m) =>
        m._id === messageId ? { ...m, ...updates } : m
      );

      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: dedupeMessages(updatedMessages),
        },
      };
    }),

  removeMessage: (chatId, messageId) =>
    set((state) => ({
      messagesByChat: {
        ...state.messagesByChat,
        [chatId]: (state.messagesByChat[chatId] || []).filter(
          (m) => m._id !== messageId
        ),
      },
    })),

  setTyping: (chatId, userId, username) =>
    set((state) => ({
      typingByChat: {
        ...state.typingByChat,
        [chatId]: {
          ...(state.typingByChat[chatId] || {}),
          [userId]: username,
        },
      },
    })),

  clearTyping: (chatId, userId) =>
    set((state) => {
      const current = { ...(state.typingByChat[chatId] || {}) };
      delete current[userId];

      return {
        typingByChat: {
          ...state.typingByChat,
          [chatId]: current,
        },
      };
    }),

  setOnlineUsers: (ids) => set({ onlineUserIds: new Set(ids) }),

  markUserOnline: (userId) =>
    set((state) => ({
      onlineUserIds: new Set(state.onlineUserIds).add(userId),
    })),

  markUserOffline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUserIds);
      next.delete(userId);

      return { onlineUserIds: next };
    }),

  getActiveMessages: () => {
    const { activeChatId, messagesByChat } = get();
    return activeChatId ? messagesByChat[activeChatId] || [] : [];
  },
}));