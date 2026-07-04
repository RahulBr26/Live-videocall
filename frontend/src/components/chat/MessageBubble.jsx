import { useState } from "react";
import { motion } from "framer-motion";
import { Check, CheckCheck, MoreHorizontal, Reply, Smile, Trash2, Pencil, Download } from "lucide-react";
import Avatar from "../common/Avatar";
import { formatRelativeTime } from "../../utils/helpers";
import { useChatStore } from "../../store/chatStore";
import { messageService } from "../../services/messageService";

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

export default function MessageBubble({ message, isMine, chatId }) {
  const [showActions, setShowActions] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || "");
  const updateMessage = useChatStore((s) => s.updateMessage);
  const removeMessage = useChatStore((s) => s.removeMessage);

  const isDeleted = message.isDeleted;
  const hasSeenBy = message.seenBy?.length > 0;
  const isDelivered = message.deliveredTo?.length > 1;

  const handleReact = async (emoji) => {
    try {
      const { reactions } = await messageService.toggleReaction(message._id, emoji);
      updateMessage(chatId, message._id, { reactions });
    } catch { /* silent */ }
    setShowEmojis(false);
  };

  const handleDelete = async () => {
    try {
      await messageService.deleteMessage(message._id);
      updateMessage(chatId, message._id, { isDeleted: true, content: "" });
    } catch { /* silent */ }
  };

  const handleEdit = async () => {
    if (!editContent.trim() || editContent === message.content) {
      setIsEditing(false);
      return;
    }
    try {
      const { message: updated } = await messageService.editMessage(message._id, editContent.trim());
      updateMessage(chatId, message._id, { content: updated.content, isEdited: true });
    } catch { /* silent */ }
    setIsEditing(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className={`group flex items-end gap-2 ${isMine ? "flex-row-reverse" : ""} ${message.isGrouped ? "mt-0.5" : "mt-3"}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmojis(false); }}
    >
      {/* Avatar — only shown for first in group, and not for own messages */}
      {!isMine && (
        <div className="w-8">
          {!message.isGrouped && (
            <Avatar src={message.sender?.avatar?.url} name={message.sender?.username} size="sm" />
          )}
        </div>
      )}

      <div className={`relative max-w-xs sm:max-w-md lg:max-w-lg`}>
        {/* Sender name in group chats */}
        {!isMine && !message.isGrouped && (
          <p className="mb-0.5 ml-1 text-[11px] font-medium text-[var(--color-text-dim)]">
            {message.sender?.username}
          </p>
        )}

        {/* Reply preview */}
        {message.replyTo && (
          <div className={`mb-1 rounded-lg border-l-2 border-[var(--color-accent)] bg-[var(--color-surface-hover)] px-2 py-1 text-xs text-[var(--color-text-dim)] ${isMine ? "ml-auto" : ""}`}>
            <span className="font-medium">{message.replyTo.sender?.username}: </span>
            {message.replyTo.isDeleted ? "Deleted message" : message.replyTo.content}
          </div>
        )}

        {/* Bubble */}
        <div
          className={`rounded-2xl px-3 py-2 ${
            isMine
              ? "rounded-br-sm bg-[var(--color-accent)] text-white"
              : "rounded-bl-sm bg-[var(--color-surface)] text-[var(--color-text)]"
          }`}
        >
          {isDeleted ? (
            <span className="italic opacity-60 text-sm">Message deleted</span>
          ) : isEditing ? (
            <div className="flex items-center gap-2">
              <input
                className="bg-transparent text-sm focus:outline-none flex-1"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleEdit(); if (e.key === "Escape") setIsEditing(false); }}
                autoFocus
              />
              <button onClick={handleEdit} className="text-xs opacity-80 hover:opacity-100">Save</button>
            </div>
          ) : message.type === "text" ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
          ) : message.type === "image" ? (
            <div>
              <img
                src={message.attachment?.url}
                alt="Image"
                className="max-w-full rounded-lg"
                style={{ maxHeight: "280px", objectFit: "contain" }}
              />
              {message.content && <p className="mt-1 text-sm">{message.content}</p>}
            </div>
          ) : message.type === "file" ? (
            <a
              href={message.attachment?.url}
              target="_blank"
              rel="noopener noreferrer"
              download={message.attachment?.fileName}
              className="flex items-center gap-2 text-sm underline underline-offset-2"
            >
              <Download className="h-4 w-4 shrink-0" />
              <span className="truncate">{message.attachment?.fileName}</span>
            </a>
          ) : message.type === "audio" || message.type === "voice" ? (
            <audio controls src={message.attachment?.url} className="max-w-[200px]" />
          ) : message.type === "video" ? (
            <video controls src={message.attachment?.url} className="max-w-full rounded-lg" style={{ maxHeight: "240px" }} />
          ) : (
            <p className="text-sm">{message.content}</p>
          )}

          {/* Timestamp + edit marker */}
          <div className={`mt-0.5 flex items-center gap-1 ${isMine ? "justify-end" : "justify-start"}`}>
            {message.isEdited && <span className="text-[10px] opacity-60">edited</span>}
            <span className="text-[10px] opacity-60">
              {formatRelativeTime(message.createdAt)}
            </span>
            {isMine && !isDeleted && (
              hasSeenBy ? (
                <CheckCheck className="h-3 w-3 opacity-80" />
              ) : isDelivered ? (
                <CheckCheck className="h-3 w-3 opacity-50" />
              ) : (
                <Check className="h-3 w-3 opacity-40" />
              )
            )}
          </div>
        </div>

        {/* Reactions */}
        {message.reactions?.length > 0 && (
          <div className={`mt-0.5 flex flex-wrap gap-1 ${isMine ? "justify-end" : ""}`}>
            {Object.entries(
              message.reactions.reduce((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {})
            ).map(([emoji, count]) => (
              <span
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="cursor-pointer rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-xs"
              >
                {emoji} {count > 1 ? count : ""}
              </span>
            ))}
          </div>
        )}

        {/* Action toolbar on hover */}
        {showActions && !isDeleted && (
          <div
            className={`absolute -top-8 flex items-center gap-0.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-lg ${isMine ? "right-0" : "left-0"}`}
          >
            <button
              onClick={() => setShowEmojis((v) => !v)}
              className="flex h-6 w-6 items-center justify-center rounded-lg text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
              title="React"
            >
              <Smile className="h-3.5 w-3.5" />
            </button>
            {isMine && message.type === "text" && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex h-6 w-6 items-center justify-center rounded-lg text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {isMine && (
              <button
                onClick={handleDelete}
                className="flex h-6 w-6 items-center justify-center rounded-lg text-[var(--color-text-dim)] hover:text-red-400 hover:bg-red-500/10"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Emoji picker */}
        {showEmojis && (
          <div className={`absolute -top-16 flex gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-lg z-10 ${isMine ? "right-0" : "left-0"}`}>
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                onClick={() => handleReact(e)}
                className="text-lg hover:scale-125 transition-transform"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
