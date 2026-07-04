const Call = require("../models/Call");
const Chat = require("../models/Chat");
const { getUserSocketIds } = require("./presenceStore");
const { createAndPushNotification } = require("../services/notificationService");

/**
 * WebRTC signaling event contract. This server never touches media itself —
 * it only relays SDP offers/answers and ICE candidates between peers, and
 * tracks call state (ringing/ongoing/ended) for history + missed-call logic.
 *
 * Client -> Server
 *   call_user         { chatId, callType: "audio"|"video", calleeIds: [] }
 *   call_accept        { callId, chatId }
 *   call_reject        { callId, chatId }
 *   call_offer         { callId, toUserId, sdp }
 *   call_answer        { callId, toUserId, sdp }
 *   ice_candidate       { callId, toUserId, candidate }
 *   screen_share_start { callId, chatId }
 *   screen_share_stop  { callId, chatId }
 *   call_end            { callId, chatId }
 *
 * Server -> Client
 *   incoming_call       { call, fromUser }
 *   call_accepted       { callId, byUserId }
 *   call_rejected       { callId, byUserId }
 *   call_offer          { callId, fromUserId, sdp }
 *   call_answer         { callId, fromUserId, sdp }
 *   ice_candidate        { callId, fromUserId, candidate }
 *   call_user_joined    { callId, userId }
 *   call_user_left      { callId, userId }
 *   screen_share_started { callId, userId }
 *   screen_share_stopped { callId, userId }
 *   call_ended           { callId, endedBy }
 */
const registerCallSocketHandlers = (io, socket) => {
  const userId = String(socket.user._id);

  // --- Initiate a call ----------------------------------------------------
  socket.on("call_user", async ({ chatId, callType, calleeIds }, ack) => {
    try {
      const chat = await Chat.findById(chatId);
      if (!chat || !chat.participants.some((p) => String(p) === userId)) {
        return socket.emit("error", { message: "Not authorized to call in this chat" });
      }

      const call = await Call.create({
        chat: chatId,
        caller: userId,
        participants: [userId],
        type: callType,
        status: "ringing",
      });

      socket.join(`call:${call._id}`);

      // Ring every callee who is currently online; others will see a missed call later
      calleeIds.forEach((calleeId) => {
        getUserSocketIds(calleeId).forEach((sId) => {
          io.to(sId).emit("incoming_call", {
            call,
            fromUser: { id: userId, username: socket.user.username, avatar: socket.user.avatar },
          });
        });
      });

      if (typeof ack === "function") ack({ success: true, call });
    } catch (err) {
      console.error("call_user error:", err.message);
      if (typeof ack === "function") ack({ success: false, message: "Failed to start call" });
    }
  });

  // --- Accept / reject ----------------------------------------------------
  socket.on("call_accept", async ({ callId, chatId }) => {
    try {
      const call = await Call.findByIdAndUpdate(
        callId,
        { status: "ongoing", $addToSet: { participants: userId } },
        { new: true }
      );
      socket.join(`call:${callId}`);
      io.to(`call:${callId}`).emit("call_accepted", { callId, byUserId: userId });
      io.to(`call:${callId}`).emit("call_user_joined", { callId, userId });
    } catch (err) {
      console.error("call_accept error:", err.message);
    }
  });

  socket.on("call_reject", async ({ callId, chatId }) => {
    try {
      await Call.findByIdAndUpdate(callId, { status: "rejected" });
      io.to(`call:${callId}`).emit("call_rejected", { callId, byUserId: userId });

      // Log a missed-call notification for the rejecting user's record
      const call = await Call.findById(callId);
      if (call) {
        await createAndPushNotification(io, {
          recipient: call.caller,
          sender: userId,
          type: "missed_call",
          chat: chatId,
          text: `${socket.user.username} declined your call`,
        });
      }
    } catch (err) {
      console.error("call_reject error:", err.message);
    }
  });

  // --- SDP / ICE relay (pure pass-through, no media handling here) -------
  socket.on("call_offer", ({ callId, toUserId, sdp }) => {
    getUserSocketIds(toUserId).forEach((sId) =>
      io.to(sId).emit("call_offer", { callId, fromUserId: userId, sdp })
    );
  });

  socket.on("call_answer", ({ callId, toUserId, sdp }) => {
    getUserSocketIds(toUserId).forEach((sId) =>
      io.to(sId).emit("call_answer", { callId, fromUserId: userId, sdp })
    );
  });

  socket.on("ice_candidate", ({ callId, toUserId, candidate }) => {
    getUserSocketIds(toUserId).forEach((sId) =>
      io.to(sId).emit("ice_candidate", { callId, fromUserId: userId, candidate })
    );
  });

  // --- Screen share state (purely informational for UI; actual stream
  //     renegotiation happens via call_offer/call_answer with the new track) ---
  socket.on("screen_share_start", ({ callId }) => {
    socket.to(`call:${callId}`).emit("screen_share_started", { callId, userId });
  });

  socket.on("screen_share_stop", ({ callId }) => {
    socket.to(`call:${callId}`).emit("screen_share_stopped", { callId, userId });
  });

  // --- End call -------------------------------------------------------------
  socket.on("call_end", async ({ callId, chatId }) => {
    try {
      const call = await Call.findById(callId);
      if (call && call.status !== "ended") {
        call.status = call.status === "ringing" ? "missed" : "ended";
        call.endedAt = new Date();
        call.durationSeconds = Math.round((call.endedAt - call.startedAt) / 1000);
        await call.save();

        if (call.status === "missed") {
          const chat = await Chat.findById(chatId);
          const missedUsers = chat.participants.filter((p) => String(p) !== String(call.caller));
          for (const recipient of missedUsers) {
            await createAndPushNotification(io, {
              recipient,
              sender: call.caller,
              type: "missed_call",
              chat: chatId,
              text: `Missed ${call.type} call`,
            });
          }
        }
      }

      io.to(`call:${callId}`).emit("call_ended", { callId, endedBy: userId });
      io.in(`call:${callId}`).socketsLeave(`call:${callId}`);
    } catch (err) {
      console.error("call_end error:", err.message);
    }
  });
};

module.exports = registerCallSocketHandlers;
