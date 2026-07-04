import { useState, useRef, useCallback } from "react";
import { Paperclip, Send, Mic, MicOff, X } from "lucide-react";
import toast from "react-hot-toast";
import { getSocket } from "../../services/socket";
import { messageService } from "../../services/messageService";
import { useChatStore } from "../../store/chatStore";
import { debounce } from "../../utils/helpers";

export default function MessageInput({ chatId }) {
  const [text, setText] = useState("");
  const [uploadProgress, setUploadProgress] = useState(null);
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const fileRef = useRef(null);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const isTypingRef = useRef(false);

  const addMessage = useChatStore((s) => s.addMessage);

  const stopTyping = useCallback(
    debounce(() => {
      const socket = getSocket();

      if (socket && isTypingRef.current) {
        socket.emit("stop_typing", { chatId });
        isTypingRef.current = false;
      }
    }, 1500),
    [chatId]
  );

  const handleTextChange = (e) => {
    setText(e.target.value);

    const socket = getSocket();

    if (socket && !isTypingRef.current) {
      socket.emit("typing", { chatId });
      isTypingRef.current = true;
    }

    stopTyping();
  };

  const clearAttachment = () => {
    if (pendingAttachment?.previewUrl) {
      URL.revokeObjectURL(pendingAttachment.previewUrl);
    }

    setPendingAttachment(null);
    setUploadProgress(null);

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error("Max file size is 25 MB");
      return;
    }

    const previewUrl = file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : null;

    const type = file.type.startsWith("image/")
      ? "image"
      : file.type.startsWith("video/")
      ? "video"
      : file.type.startsWith("audio/")
      ? "audio"
      : "file";

    setPendingAttachment({ file, previewUrl, type });
  };

  const startRecording = async () => {
    if (isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });

      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });

        stream.getTracks().forEach((t) => t.stop());

        if (blob.size === 0) {
          toast.error("Voice recording is empty. Hold the button longer.");
          return;
        }

        const file = new File([blob], `voice-${Date.now()}.webm`, {
          type: "audio/webm",
        });

        setPendingAttachment({
          file,
          previewUrl: null,
          type: "voice",
        });
      };

      recorder.start();
      mediaRef.current = recorder;
      setIsRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (!mediaRef.current || mediaRef.current.state === "inactive") return;

    mediaRef.current.stop();
    setIsRecording(false);
  };

  const handleSend = async () => {
    const hasText = text.trim().length > 0;
    const hasFile = !!pendingAttachment;

    if (!hasText && !hasFile) return;
    if (isSending) return;

    setIsSending(true);

    const socket = getSocket();

    try {
      if (hasFile) {
        const { attachment, suggestedType } = await messageService.uploadAttachment(
          chatId,
          pendingAttachment.file,
          setUploadProgress
        );

        socket.emit(
          "send_message",
          {
            chatId,
            type: pendingAttachment.type === "voice" ? "voice" : suggestedType,
            content: text.trim() || "",
            attachment,
          },
          ({ success, message }) => {
            if (success) {
              addMessage(chatId, message);
            }
          }
        );

        clearAttachment();
      } else {
        const tempId = `temp-${Date.now()}`;

        const optimistic = {
          _id: tempId,
          chat: chatId,
          sender: { _id: "me", username: "Me" },
          type: "text",
          content: text.trim(),
          createdAt: new Date().toISOString(),
          seenBy: [],
          deliveredTo: [],
        };

        addMessage(chatId, optimistic);

        socket.emit(
          "send_message",
          { chatId, type: "text", content: text.trim() },
          ({ success, message }) => {
            if (success) {
              useChatStore
                .getState()
                .updateMessage(chatId, tempId, { ...message, _id: message._id });
            }
          }
        );
      }

      setText("");

      if (socket && isTypingRef.current) {
        socket.emit("stop_typing", { chatId });
        isTypingRef.current = false;
      }
    } catch {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      {pendingAttachment && (
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-[var(--color-bg)] px-3 py-2">
          {pendingAttachment.previewUrl ? (
            <img
              src={pendingAttachment.previewUrl}
              className="h-12 w-12 rounded-lg object-cover"
              alt=""
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-surface-hover)] text-xl">
              {pendingAttachment.type === "voice"
                ? "🎤"
                : pendingAttachment.type === "video"
                ? "🎬"
                : "📎"}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">
              {pendingAttachment.file.name}
            </p>
            <p className="text-[10px] text-[var(--color-text-dim)]">
              {(pendingAttachment.file.size / 1024).toFixed(1)} KB
            </p>

            {uploadProgress !== null && (
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-hover)]">
                <div
                  className="h-full rounded-full bg-[var(--color-accent)] transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>

          <button
            onClick={clearAttachment}
            className="text-[var(--color-text-dim)] hover:text-red-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--color-text-dim)] transition hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
          title="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
        />

        <textarea
          rows={1}
          value={text}
          onChange={handleTextChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message… (Enter to send)"
          className="flex-1 resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-accent)] focus:outline-none"
          style={{ maxHeight: "120px", overflowY: "auto" }}
        />

        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          className={`mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
            isRecording
              ? "bg-red-500/20 text-red-400"
              : "text-[var(--color-text-dim)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
          }`}
          title="Hold to record voice"
        >
          {isRecording ? (
            <MicOff className="h-4 w-4 animate-pulse" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </button>

        <button
          onClick={handleSend}
          disabled={(!text.trim() && !pendingAttachment) || isSending}
          className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          title="Send"
        >
          {isSending ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}