import { create } from "zustand";

export const useCallStore = create((set) => ({
  activeCall: null, // { callId, chatId, type, status: 'ringing'|'ongoing', isIncoming, fromUser }
  remoteStreams: {}, // { [userId]: MediaStream }
  localStream: null,
  isMuted: false,
  isCameraOff: false,
  isScreenSharing: false,

  setActiveCall: (call) => set({ activeCall: call }),
  clearCall: () =>
    set({
      activeCall: null,
      remoteStreams: {},
      localStream: null,
      isMuted: false,
      isCameraOff: false,
      isScreenSharing: false,
    }),

  setLocalStream: (stream) => set({ localStream: stream }),
  addRemoteStream: (userId, stream) =>
    set((state) => ({ remoteStreams: { ...state.remoteStreams, [userId]: stream } })),
  removeRemoteStream: (userId) =>
    set((state) => {
      const next = { ...state.remoteStreams };
      delete next[userId];
      return { remoteStreams: next };
    }),

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  toggleCamera: () => set((state) => ({ isCameraOff: !state.isCameraOff })),
  setScreenSharing: (val) => set({ isScreenSharing: val }),
}));
