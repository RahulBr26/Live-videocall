import { AnimatePresence, motion } from "framer-motion";
import MessageBubble from "./MessageBubble";

export default function MessageList({ messages, currentUserId, chatId }) {
  if (!messages.length) {
    return (
      <div className="flex h-full items-center justify-center py-16 text-sm text-[var(--color-text-dim)]">
        No messages yet. Say hello!
      </div>
    );
  }

  // Group consecutive messages by sender for visual condensing
  const grouped = messages.reduce((groups, msg, i) => {
    const prev = messages[i - 1];
    const sameSender = prev && prev.sender?._id === msg.sender?._id;
    const close = prev && (new Date(msg.createdAt) - new Date(prev.createdAt)) < 5 * 60 * 1000;
    groups.push({ ...msg, isGrouped: sameSender && close });
    return groups;
  }, []);

  return (
    <div className="space-y-0.5 pb-2">
      <AnimatePresence initial={false}>
        {grouped.map((msg) => (
          <MessageBubble
            key={msg._id}
            message={msg}
            isMine={msg.sender?._id === currentUserId}
            chatId={chatId}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
