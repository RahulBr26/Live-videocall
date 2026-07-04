/** Returns the other participant in a 1-to-1 chat (not the current user). */
export const getOtherParticipant = (chat, currentUserId) => {
  if (!chat || chat.isGroup) return null;
  return chat.participants.find((p) => p._id !== currentUserId) || null;
};

/** Display name/avatar for a chat list item, handling both 1-to-1 and group chats. */
export const getChatDisplayInfo = (chat, currentUserId) => {
  if (chat.isGroup) {
    return { name: chat.groupName, avatarUrl: chat.groupAvatar?.url || "" };
  }
  const other = getOtherParticipant(chat, currentUserId);
  return { name: other?.username || "Unknown user", avatarUrl: other?.avatar?.url || "" };
};

export const formatRelativeTime = (date) => {
  if (!date) return "";
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return new Date(date).toLocaleDateString();
};

export const initials = (name = "") =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** Simple debounce, used for typing indicators and search inputs. */
export const debounce = (fn, delay = 300) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};
