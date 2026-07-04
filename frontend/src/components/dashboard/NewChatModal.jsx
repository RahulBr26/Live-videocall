import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, X, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Avatar from "../common/Avatar";
import Button from "../common/Button";
import { chatService } from "../../services/chatService";
import { useChatStore } from "../../store/chatStore";
import { debounce } from "../../utils/helpers";

export default function NewChatModal({ onClose }) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [mode, setMode] = useState("dm"); // dm | group
  const [groupName, setGroupName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();
  const upsertChat = useChatStore((s) => s.upsertChat);

  const setDebounced = useCallback(debounce(setDebouncedQ, 300), []);
  const handleSearch = (v) => { setQ(v); setDebounced(v); };

  const { data, isFetching } = useQuery({
    queryKey: ["user-search", debouncedQ],
    queryFn: () => chatService.searchUsers(debouncedQ),
    enabled: debouncedQ.trim().length > 0,
  });

  const toggle = (user) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u._id === user._id)
        ? prev.filter((u) => u._id !== user._id)
        : [...prev, user]
    );
  };

  const handleStart = async () => {
    setIsCreating(true);
    try {
      if (mode === "dm" && selectedUsers.length === 1) {
        const { chat } = await chatService.accessOneToOne(selectedUsers[0]._id);
        upsertChat(chat);
        navigate(`/dashboard/chat/${chat._id}`);
        onClose();
      } else if (mode === "group" && groupName.trim() && selectedUsers.length >= 1) {
        const { group } = await chatService.createGroup({
          groupName: groupName.trim(),
          participantIds: selectedUsers.map((u) => u._id),
        });
        upsertChat(group);
        navigate(`/dashboard/chat/${group._id}`);
        onClose();
      }
    } catch { /* errors surfaced via react-query */ }
    setIsCreating(false);
  };

  const canCreate =
    (mode === "dm" && selectedUsers.length === 1) ||
    (mode === "group" && groupName.trim() && selectedUsers.length >= 1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="glass w-full max-w-md rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg font-semibold">New conversation</h3>
          <button onClick={onClose} className="text-[var(--color-text-dim)] hover:text-[var(--color-text)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 rounded-xl bg-[var(--color-bg)] p-1 mb-4">
          {[{ id: "dm", label: "Direct message" }, { id: "group", label: "Group chat", icon: Users }].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => { setMode(id); setSelectedUsers([]); }}
              className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition ${
                mode === id
                  ? "bg-[var(--color-surface)] text-[var(--color-text)]"
                  : "text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "group" && (
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name"
            className="mb-3 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
          />
        )}

        {/* Selected chips */}
        {selectedUsers.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {selectedUsers.map((u) => (
              <span key={u._id} className="flex items-center gap-1 rounded-full bg-[var(--color-accent-dim)] px-2 py-0.5 text-xs text-[var(--color-accent)]">
                {u.username}
                <button onClick={() => toggle(u)}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 mb-3">
          <Search className="h-4 w-4 text-[var(--color-text-dim)]" />
          <input
            value={q}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search users by name or email…"
            className="w-full bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none"
          />
          {isFetching && <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />}
        </div>

        {/* Results */}
        <div className="max-h-52 overflow-y-auto space-y-0.5">
          {(data?.users || []).map((u) => {
            const selected = selectedUsers.some((s) => s._id === u._id);
            return (
              <button
                key={u._id}
                onClick={() => mode === "dm" ? setSelectedUsers([u]) : toggle(u)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                  selected ? "bg-[var(--color-accent-dim)]" : "hover:bg-[var(--color-surface-hover)]"
                }`}
              >
                <Avatar src={u.avatar?.url} name={u.username} size="sm" isOnline={u.isOnline} showStatus />
                <div>
                  <p className="text-sm font-medium">{u.username}</p>
                  <p className="text-xs text-[var(--color-text-dim)]">{u.email}</p>
                </div>
                {selected && <span className="ml-auto text-xs text-[var(--color-accent)]">✓</span>}
              </button>
            );
          })}
        </div>

        <Button onClick={handleStart} disabled={!canCreate} isLoading={isCreating} className="mt-4 w-full">
          {mode === "dm" ? "Start chat" : "Create group"}
        </Button>
      </motion.div>
    </motion.div>
  );
}
