import { useRef, useCallback, useEffect } from "react";
import { getSocket } from "../services/socket";
import { useCallStore } from "../store/callStore";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

/**
 * Manages WebRTC peer connections for calls.
 * Each remote user gets their own RTCPeerConnection stored in peersRef.
 *
 * Usage:
 *   const { startLocalStream, callUser, hangup, toggleMute, toggleCamera, shareScreen } = useWebRTC(callId);
 */
export function useWebRTC(callId) {
  const peersRef = useRef({});
  const {
    setLocalStream,
    addRemoteStream,
    removeRemoteStream,
    localStream,
    isMuted,
    isCameraOff,
    setScreenSharing,
    clearCall,
  } = useCallStore();

  const createPeer = useCallback(
    (remoteUserId, localStream, isInitiator) => {
      const socket = getSocket();
      const peer = new RTCPeerConnection(ICE_SERVERS);

      // Add all local tracks to the connection
      localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));

      peer.onicecandidate = ({ candidate }) => {
        if (candidate && socket) {
          socket.emit("ice_candidate", { callId, toUserId: remoteUserId, candidate });
        }
      };

      peer.ontrack = ({ streams: [stream] }) => {
        addRemoteStream(remoteUserId, stream);
      };

      peer.onconnectionstatechange = () => {
        if (["disconnected", "failed", "closed"].includes(peer.connectionState)) {
          removeRemoteStream(remoteUserId);
          delete peersRef.current[remoteUserId];
        }
      };

      if (isInitiator) {
        peer
          .createOffer()
          .then((offer) => peer.setLocalDescription(offer))
          .then(() => {
            socket?.emit("call_offer", { callId, toUserId: remoteUserId, sdp: peer.localDescription });
          });
      }

      peersRef.current[remoteUserId] = peer;
      return peer;
    },
    [callId, addRemoteStream, removeRemoteStream]
  );

  const startLocalStream = useCallback(
    async ({ audio = true, video = false } = {}) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio, video });
        setLocalStream(stream);
        return stream;
      } catch (err) {
        console.error("getUserMedia failed:", err);
        throw err;
      }
    },
    [setLocalStream]
  );

  const callUser = useCallback(
    (remoteUserId, stream) => {
      createPeer(remoteUserId, stream, true);
    },
    [createPeer]
  );

  const handleOffer = useCallback(
    async ({ fromUserId, sdp }) => {
      const stream = useCallStore.getState().localStream;
      if (!stream) return;
      const peer = createPeer(fromUserId, stream, false);
      await peer.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      getSocket()?.emit("call_answer", { callId, toUserId: fromUserId, sdp: peer.localDescription });
    },
    [callId, createPeer]
  );

  const handleAnswer = useCallback(async ({ fromUserId, sdp }) => {
    const peer = peersRef.current[fromUserId];
    if (peer) await peer.setRemoteDescription(new RTCSessionDescription(sdp));
  }, []);

  const handleIceCandidate = useCallback(async ({ fromUserId, candidate }) => {
    const peer = peersRef.current[fromUserId];
    if (peer && candidate) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch { /* candidate may arrive before setRemoteDescription in edge cases */ }
    }
  }, []);

  const toggleMute = useCallback(() => {
    const stream = useCallStore.getState().localStream;
    stream?.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    useCallStore.getState().toggleMute();
  }, []);

  const toggleCamera = useCallback(() => {
    const stream = useCallStore.getState().localStream;
    stream?.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    useCallStore.getState().toggleCamera();
  }, []);

  const shareScreen = useCallback(async () => {
    const socket = getSocket();
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];

      // Replace the camera track with the screen track in all peer connections
      Object.values(peersRef.current).forEach((peer) => {
        const sender = peer.getSenders().find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(screenTrack);
      });

      setScreenSharing(true);
      socket?.emit("screen_share_start", { callId });

      screenTrack.onended = () => {
        // Restore camera when screen share is stopped via the browser UI
        const localStream = useCallStore.getState().localStream;
        const cameraTrack = localStream?.getVideoTracks()[0];
        if (cameraTrack) {
          Object.values(peersRef.current).forEach((peer) => {
            const sender = peer.getSenders().find((s) => s.track?.kind === "video");
            if (sender) sender.replaceTrack(cameraTrack);
          });
        }
        setScreenSharing(false);
        socket?.emit("screen_share_stop", { callId });
      };
    } catch { /* user cancelled */ }
  }, [callId, setScreenSharing]);

  const hangup = useCallback(() => {
    const socket = getSocket();
    socket?.emit("call_end", { callId });

    const { localStream } = useCallStore.getState();
    localStream?.getTracks().forEach((t) => t.stop());

    Object.values(peersRef.current).forEach((peer) => peer.close());
    peersRef.current = {};
    clearCall();
  }, [callId, clearCall]);

  // Subscribe to socket signaling events
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on("call_offer", handleOffer);
    socket.on("call_answer", handleAnswer);
    socket.on("ice_candidate", handleIceCandidate);

    return () => {
      socket.off("call_offer", handleOffer);
      socket.off("call_answer", handleAnswer);
      socket.off("ice_candidate", handleIceCandidate);
    };
  }, [handleOffer, handleAnswer, handleIceCandidate]);

  return { startLocalStream, callUser, hangup, toggleMute, toggleCamera, shareScreen };
}
