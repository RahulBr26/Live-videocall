import { useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { getSocket } from "../services/socket";
import { chatService } from "../services/chatService";
import { messageService } from "../services/messageService";
import { useChatStore } from "../store/chatStore";
import { useAuthStore } from "../store/authStore";
import ChatHeader from "../components/chat/ChatHeader";
import MessageList from "../components/chat/MessageList";
import MessageInput from "../components/chat/MessageInput";
import TypingIndicator from "../components/chat/TypingIndicator";

const EMPTY_MESSAGES = [];
const EMPTY_TYPING = {};

export default function ChatPage() {
  const { chatId } = useParams();
  const messagesEndRef = useRef(null);

  const user = useAuthStore((s) => s.user);
  const setMessagesForChat = useChatStore((s) => s.setMessagesForChat);
  const setActiveChatId = useChatStore((s) => s.setActiveChatId);
  const typingByChat = useChatStore((s) => s.typingByChat);
  const messages = useChatStore((s) => s.messagesByChat[chatId] ?? EMPTY_MESSAGES);

  const { ref: topRef, inView } = useInView({ threshold: 0 });

  useEffect(() => {
    setActiveChatId(chatId);
    return () => setActiveChatId(null);
  }, [chatId, setActiveChatId]);

  const { data: chatData } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: () => chatService.getChatById(chatId),
    enabled: !!chatId,
  });

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["messages", chatId],
    queryFn: ({ pageParam = 1 }) => messageService.getMessages(chatId, pageParam),
    initialPageParam: 1,
    enabled: !!chatId,
    getNextPageParam: (last) =>
      last.pagination.hasMore ? last.pagination.page + 1 : undefined,
    onSuccess: (data) => {
      const allMessages = data.pages.flatMap((p) => p.messages);
      setMessagesForChat(chatId, allMessages);
    },
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !chatId) return;

    socket.emit("join_room", { chatId });
    return () => socket.emit("leave_room", { chatId });
  }, [chatId]);

  const markSeen = useCallback(() => {
    const socket = getSocket();
    if (!socket || !chatId) return;

    const unseenIds = messages
      .filter((m) => m.sender._id !== user?.id && !(m.seenBy || []).includes(user?.id))
      .map((m) => m._id);

    if (unseenIds.length > 0) {
      socket.emit("message_seen", { chatId, messageIds: unseenIds });
    }
  }, [chatId, messages, user?.id]);

  useEffect(() => {
    markSeen();
    window.addEventListener("focus", markSeen);
    return () => window.removeEventListener("focus", markSeen);
  }, [markSeen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const typingUsers = Object.values(typingByChat[chatId] ?? EMPTY_TYPING);
  const chat = chatData?.chat;

  return (
    <div className="flex h-full flex-col">
      {chat && <ChatHeader chat={chat} currentUserId={user?.id} />}

      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div ref={topRef} className="flex justify-center py-2">
          {isFetchingNextPage && (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
          )}
        </div>

        <MessageList messages={messages} currentUserId={user?.id} chatId={chatId} />

        <div ref={messagesEndRef} />
      </div>

      {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}

      <MessageInput chatId={chatId} />
    </div>
  );
}