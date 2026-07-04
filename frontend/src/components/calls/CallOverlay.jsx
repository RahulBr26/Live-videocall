import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCallStore } from "../../store/callStore";
import { getSocket } from "../../services/socket";

/**
 * Renders in the DashboardLayout for incoming call toasts and
 * a mini HUD when a call is ringing/ongoing.
 */
export default function CallOverlay() {
  const { activeCall, setActiveCall, clearCall } = useCallStore();
  const navigate = useNavigate();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleIncoming = ({ call, fromUser }) => {
      setActiveCall({
        callId: call._id,
        chatId: call.chat,
        type: call.type,
        status: "ringing",
        isIncoming: true,
        fromUser,
      });
    };

    const handleCallEnded = () => clearCall();
    const handleCallRejected = () => clearCall();

    socket.on("incoming_call", handleIncoming);
    socket.on("call_ended", handleCallEnded);
    socket.on("call_rejected", handleCallRejected);

    return () => {
      socket.off("incoming_call", handleIncoming);
      socket.off("call_ended", handleCallEnded);
      socket.off("call_rejected", handleCallRejected);
    };
  }, [setActiveCall, clearCall]);

  const accept = () => {
    const socket = getSocket();
    socket?.emit("call_accept", { callId: activeCall.callId, chatId: activeCall.chatId });
    navigate(`/call/${activeCall.chatId}`);
  };

  const reject = () => {
    const socket = getSocket();
    socket?.emit("call_reject", { callId: activeCall.callId, chatId: activeCall.chatId });
    clearCall();
  };

  return (
    <AnimatePresence>
      {activeCall?.isIncoming && activeCall.status === "ringing" && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="fixed top-4 left-1/2 z-50 -translate-x-1/2 glass rounded-2xl p-4 flex items-center gap-4 shadow-2xl min-w-72"
        >
          <div className="flex-1">
            <p className="text-xs text-[var(--color-text-dim)]">Incoming {activeCall.type} call</p>
            <p className="font-display font-semibold">{activeCall.fromUser?.username || "Unknown"}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={reject}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition"
            >
              <PhoneOff className="h-5 w-5" />
            </button>
            <button
              onClick={accept}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-online)]/20 text-[var(--color-online)] hover:bg-[var(--color-online)]/30 transition"
            >
              <Phone className="h-5 w-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
