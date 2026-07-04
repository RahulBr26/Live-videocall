import { useEffect } from "react";
import toast from "react-hot-toast";
import { getSocket } from "../services/socket";
import { useChatStore } from "../store/chatStore";
import { useAuthStore } from "../store/authStore";

export const useChatSocketEvents = () => {
  const currentUserId = useAuthStore((s) => s.user?.id);

  const addMessage = useChatStore((s) => s.addMessage);
  const upsertChat = useChatStore((s) => s.upsertChat);
  const setTyping = useChatStore((s) => s.setTyping);
  const clearTyping = useChatStore((s) => s.clearTyping);
  const setOnlineUsers = useChatStore((s) => s.setOnlineUsers);
  const markUserOnline = useChatStore((s) => s.markUserOnline);
  const markUserOffline = useChatStore((s) => s.markUserOffline);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const activeChatId = useChatStore((s) => s.activeChatId);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleReceiveMessage = ({ message }) => {
      addMessage(message.chat, message);
      upsertChat({ _id: message.chat, lastMessage: message, updatedAt: new Date().toISOString() });

      // Only toast for messages not in the chat the user is currently viewing
      if (message.chat !== activeChatId && message.sender._id !== currentUserId) {
        toast(`${message.sender.username}: ${message.type === "text" ? message.content : `sent a ${message.type}`}`);
      }
    };

    const handleTyping = ({ chatId, userId, username }) => setTyping(chatId, userId, username);
    const handleStopTyping = ({ chatId, userId }) => clearTyping(chatId, userId);

    const handleOnlineUsers = (ids) => setOnlineUsers(ids);
    const handleUserOnline = ({ userId }) => markUserOnline(userId);
    const handleUserOffline = ({ userId }) => markUserOffline(userId);

    const handleMessageSeen = ({ chatId, messageIds, userId }) => {
      const messages = useChatStore.getState().messagesByChat[chatId] || [];
      messageIds.forEach((id) => {
        const msg = messages.find((m) => m._id === id);
        if (!msg) return;
        const seenBy = msg.seenBy?.includes(userId) ? msg.seenBy : [...(msg.seenBy || []), userId];
        updateMessage(chatId, id, { seenBy });
      });
    };

    const handleNewNotification = ({ notification }) => {
      toast(notification.text, { icon: "🔔" });
    };

    const handleError = ({ message }) => toast.error(message);

    socket.on("receive_message", handleReceiveMessage);
    socket.on("typing", handleTyping);
    socket.on("stop_typing", handleStopTyping);
    socket.on("online_users", handleOnlineUsers);
    socket.on("user_online", handleUserOnline);
    socket.on("user_offline", handleUserOffline);
    socket.on("message_seen", handleMessageSeen);
    socket.on("new_notification", handleNewNotification);
    socket.on("error", handleError);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("typing", handleTyping);
      socket.off("stop_typing", handleStopTyping);
      socket.off("online_users", handleOnlineUsers);
      socket.off("user_online", handleUserOnline);
      socket.off("user_offline", handleUserOffline);
      socket.off("message_seen", handleMessageSeen);
      socket.off("new_notification", handleNewNotification);
      socket.off("error", handleError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId, currentUserId]);
};
