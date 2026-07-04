import { Phone, Video, MoreVertical, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Avatar from "../common/Avatar";
import { useChatStore } from "../../store/chatStore";
import { getChatDisplayInfo, getOtherParticipant, formatRelativeTime } from "../../utils/helpers";
import { useCallStore } from "../../store/callStore";
import { getSocket } from "../../services/socket";

export default function ChatHeader({ chat, currentUserId }) {
  const onlineUserIds = useChatStore((s) => s.onlineUserIds);
  const setActiveCall = useCallStore((s) => s.setActiveCall);
  const navigate = useNavigate();

  const { name, avatarUrl } = getChatDisplayInfo(chat, currentUserId);
  const other = getOtherParticipant(chat, currentUserId);
  const isOnline = !chat.isGroup && other && onlineUserIds.has(other._id);
  const subtitle = chat.isGroup
    ? `${chat.participants.length} members`
    : isOnline
    ? "Online"
    : other?.lastSeen
    ? `Last seen ${formatRelativeTime(other.lastSeen)}`
    : "Offline";

  const startCall = (type) => {
    const socket = getSocket();
    if (!socket) return;
    const calleeIds = chat.participants
      .filter((p) => p._id !== currentUserId)
      .map((p) => p._id);

    socket.emit("call_user", { chatId: chat._id, callType: type, calleeIds }, ({ call }) => {
      if (call) {
        setActiveCall({ callId: call._id, chatId: chat._id, type, status: "ringing", isIncoming: false });
        navigate(`/call/${chat._id}`);
      }
    });
  };

  return (
    <header className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <button
        onClick={() => navigate("/dashboard")}
        className="mr-1 text-[var(--color-text-dim)] hover:text-[var(--color-text)] md:hidden"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <Avatar src={avatarUrl} name={name} size="md" isOnline={isOnline} showStatus />

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{name}</p>
        <p className="text-xs text-[var(--color-text-dim)]">{subtitle}</p>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => startCall("audio")}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-dim)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
          title="Audio call"
        >
          <Phone className="h-4 w-4" />
        </button>
        <button
          onClick={() => startCall("video")}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-dim)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
          title="Video call"
        >
          <Video className="h-4 w-4" />
        </button>
        <button className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-dim)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]">
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
