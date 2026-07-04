import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Settings, LogOut, Plus, Search } from "lucide-react";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";

import Avatar from "../common/Avatar";
import NewChatModal from "./NewChatModal";
import { useAuthStore } from "../../store/authStore";
import { useChatStore } from "../../store/chatStore";
import { chatService } from "../../services/chatService";
import { authService } from "../../services/authService";
import { disconnectSocket } from "../../services/socket";
import { getChatDisplayInfo, formatRelativeTime } from "../../utils/helpers";

export default function Sidebar() {
  const [showNewChat, setShowNewChat] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { chats, setChats, onlineUserIds } = useChatStore();

  const { isLoading } = useQuery({
    queryKey: ["chats"],
    queryFn: chatService.getMyChats,
    onSuccess: (data) => setChats(data.chats),
  });

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch { /* best-effort */ }
    disconnectSocket();
    logout();
    navigate("/login");
    toast.success("Logged out");
  };

  const filtered = chats.filter((c) => {
    if (!search.trim()) return true;
    const { name } = getChatDisplayInfo(c, user?.id);
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <>
      <aside className="flex h-full w-full flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] md:w-72">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4">
          <span className="font-display text-base font-semibold">LiveChat</span>
          <button
            onClick={() => setShowNewChat(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-dim)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            title="New conversation"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 rounded-xl bg-[var(--color-bg)] px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-[var(--color-text-dim)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none"
            />
          </div>
        </div>

        {/* Chat list */}
        <nav className="flex-1 overflow-y-auto py-1">
          {isLoading && (
            <div className="space-y-1 px-2 pt-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl p-3">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-[var(--color-surface-hover)] animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-24 rounded bg-[var(--color-surface-hover)] animate-pulse" />
                    <div className="h-2.5 w-36 rounded bg-[var(--color-surface-hover)] animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}

          <AnimatePresence>
            {filtered.map((chat) => (
              <ChatListItem
                key={chat._id}
                chat={chat}
                currentUserId={user?.id}
                onlineUserIds={onlineUserIds}
              />
            ))}
          </AnimatePresence>

          {!isLoading && filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-xs text-[var(--color-text-dim)]">
              {search ? "No conversations match." : "No conversations yet. Start one ↑"}
            </p>
          )}
        </nav>

        {/* Bottom nav */}
        <div className="border-t border-[var(--color-border)] p-2">
          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-[var(--color-accent-dim)] text-[var(--color-accent)]"
                  : "text-[var(--color-text-dim)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
              }`
            }
          >
            <Settings className="h-4 w-4" />
            Settings
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-[var(--color-text-dim)] transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>

        {/* Current user strip */}
        <div className="flex items-center gap-3 border-t border-[var(--color-border)] px-4 py-3">
          <Avatar src={user?.avatar?.url} name={user?.username} size="sm" isOnline showStatus />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.username}</p>
            <p className="truncate text-xs text-[var(--color-text-dim)]">{user?.statusMessage || "Online"}</p>
          </div>
        </div>
      </aside>

      <AnimatePresence>
        {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
      </AnimatePresence>
    </>
  );
}

function ChatListItem({ chat, currentUserId, onlineUserIds }) {
  const { name, avatarUrl } = getChatDisplayInfo(chat, currentUserId);
  const isOnline = !chat.isGroup &&
    chat.participants?.some((p) => p._id !== currentUserId && onlineUserIds.has(p._id));
  const lastMsg = chat.lastMessage;
  const preview = lastMsg
    ? lastMsg.isDeleted
      ? "Message deleted"
      : lastMsg.type === "text"
      ? lastMsg.content
      : `📎 ${lastMsg.type}`
    : "No messages yet";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.18 }}
    >
      <NavLink
        to={`/dashboard/chat/${chat._id}`}
        className={({ isActive }) =>
          `mx-2 flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
            isActive ? "bg-[var(--color-accent-dim)]" : "hover:bg-[var(--color-surface-hover)]"
          }`
        }
      >
        <Avatar src={avatarUrl} name={name} size="md" isOnline={isOnline} showStatus />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-1">
            <span className="truncate text-sm font-medium">{name}</span>
            <span className="shrink-0 text-[10px] text-[var(--color-text-dim)]">
              {formatRelativeTime(chat.updatedAt)}
            </span>
          </div>
          <p className="truncate text-xs text-[var(--color-text-dim)]">{preview}</p>
        </div>
      </NavLink>
    </motion.div>
  );
}
