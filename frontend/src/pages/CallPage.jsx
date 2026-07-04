import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor } from "lucide-react";
import { useCallStore } from "../store/callStore";
import { useWebRTC } from "../hooks/useWebRTC";

export default function CallPage() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const localVideoRef = useRef(null);

  const {
    activeCall,
    localStream,
    remoteStreams,
    isMuted,
    isCameraOff,
    isScreenSharing,
  } = useCallStore();

  const {
    startLocalStream,
    callUser,
    hangup,
    toggleMute,
    toggleCamera,
    shareScreen,
  } = useWebRTC(activeCall?.callId);

  useEffect(() => {
    if (!activeCall) {
      navigate(-1);
      return;
    }

    let cancelled = false;

    const init = async () => {
      try {
        const stream = await startLocalStream({
          audio: true,
          video: activeCall.type === "video",
        });

        if (cancelled) return;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        if (activeCall.isIncoming) {
          const callerId = activeCall.fromUser?.id || activeCall.fromUser?._id;

          if (callerId) {
            callUser(callerId, stream);
          }
        }
      } catch {
        // mic/camera denied
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [activeCall, callUser, navigate, startLocalStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const handleHangup = () => {
    hangup();
    navigate(-1);
  };

  const remoteEntries = Object.entries(remoteStreams);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#080a0e]">
      <div
        className="min-h-0 flex-1 grid gap-2 p-4"
        style={{
          gridTemplateColumns:
            remoteEntries.length > 1 ? "repeat(2, 1fr)" : "1fr",
        }}
      >
        {remoteEntries.length === 0 ? (
          <div className="flex items-center justify-center text-white/40 text-sm">
            Waiting for others to join…
          </div>
        ) : (
          remoteEntries.map(([userId, stream]) => (
            <RemoteVideo key={userId} stream={stream} />
          ))
        )}
      </div>

      <div className="absolute top-4 right-4 w-36 overflow-hidden rounded-xl border border-white/10 shadow-2xl">
        <video
          ref={localVideoRef}
          muted
          autoPlay
          playsInline
          className={`w-full ${isCameraOff ? "opacity-0" : ""}`}
        />

        {isCameraOff && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-surface)] text-[var(--color-text-dim)] text-xs">
            Camera off
          </div>
        )}
      </div>

      <div className="shrink-0 flex items-center justify-center gap-4 bg-black/40 py-4 backdrop-blur-sm">
        <CallButton
          onClick={toggleMute}
          active={isMuted}
          danger
          label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </CallButton>

        {activeCall?.type === "video" && (
          <CallButton
            onClick={toggleCamera}
            active={isCameraOff}
            label={isCameraOff ? "Camera on" : "Camera off"}
          >
            {isCameraOff ? (
              <VideoOff className="h-5 w-5" />
            ) : (
              <Video className="h-5 w-5" />
            )}
          </CallButton>
        )}

        <CallButton
          onClick={shareScreen}
          active={isScreenSharing}
          label="Share screen"
        >
          <Monitor className="h-5 w-5" />
        </CallButton>

        <button
          onClick={handleHangup}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition hover:bg-red-600"
          title="End call"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}

function RemoteVideo({ stream }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      className="h-full max-h-full w-full rounded-2xl object-cover bg-[var(--color-surface)]"
    />
  );
}

function CallButton({ children, onClick, active, danger, label }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
        danger && active
          ? "bg-red-500/20 text-red-400"
          : active
          ? "bg-[var(--color-accent-dim)] text-[var(--color-accent)]"
          : "bg-white/10 text-white hover:bg-white/20"
      }`}
    >
      {children}
    </button>
  );
}