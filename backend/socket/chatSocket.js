const User = require("../models/User");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const socketAuthMiddleware = require("./socketAuth");
const registerCallSocketHandlers = require("./callSocket");
const {
  addUserSocket,
  removeUserSocket,
  isUserOnline,
  getOnlineUserIds,
} = require("./presenceStore");
const { createAndPushNotification } = require("../services/notificationService");

/**
 * Registers all Socket.IO connection handling and chat events.
 *
 * Event contract:
 *  Client -> Server
 *    join_room        { chatId }
 *    leave_room       { chatId }
 *    send_message      { chatId, type, content, attachment?, replyTo? }
 *    typing             { chatId }
 *    stop_typing       { chatId }
 *    message_seen      { chatId, messageIds: [] }
 *
 *  Server -> Client
 *    user_online       { userId }
 *    user_offline       { userId, lastSeen }
 *    online_users        [userId, ...]            (sent on connect)
 *    receive_message   { message }
 *    typing             { chatId, userId, username }
 *    stop_typing       { chatId, userId }
 *    message_delivered { chatId, messageId, userId }
 *    message_seen      { chatId, messageIds, userId }
 *    error               { message }
 */
const registerSocketHandlers = (io) => {
  io.use(socketAuthMiddleware);

  io.on("connection", async (socket) => {
    const userId = String(socket.user._id);
    console.log(`Socket connected: ${socket.id} (user ${socket.user.username})`);

    addUserSocket(userId, socket.id);

    // Mark online in DB only on the FIRST connection for this user (avoid redundant writes
    // and flapping status when a user has multiple tabs open).
    const wasAlreadyOnline = isUserOnline(userId) && getOnlineUserIds().includes(userId);
    await User.findByIdAndUpdate(userId, { isOnline: true });
    socket.broadcast.emit("user_online", { userId });

    // Send the new connection the current full list of online users
    socket.emit("online_users", getOnlineUserIds());

    // WebRTC call signaling (offer/answer/ICE relay, ring/accept/reject, etc.)
    registerCallSocketHandlers(io, socket);

    // --- Room management -------------------------------------------------
    socket.on("join_room", async ({ chatId }) => {
      try {
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.some((p) => String(p) === userId)) {
          return socket.emit("error", { message: "Not authorized to join this room" });
        }
        socket.join(chatId);
      } catch (err) {
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    socket.on("leave_room", ({ chatId }) => {
      socket.leave(chatId);
    });

    // --- Messaging ---------------------------------------------------------
    socket.on("send_message", async (payload, ack) => {
      try {
        const { chatId, type = "text", content, attachment, replyTo } = payload;

        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.some((p) => String(p) === userId)) {
          return socket.emit("error", { message: "Not authorized to message in this room" });
        }

        const message = await Message.create({
          chat: chatId,
          sender: userId,
          type,
          content,
          attachment,
          replyTo: replyTo || undefined,
          deliveredTo: [userId], // sender implicitly has it
        });

        await message.populate("sender", "username avatar");
        if (replyTo) {
          await message.populate({ path: "replyTo", populate: { path: "sender", select: "username" } });
        }

        // Update chat metadata for sidebar previews + unread counts
        const unread = chat.unreadCounts || new Map();
        chat.participants.forEach((p) => {
          const pid = String(p);
          if (pid !== userId) {
            unread.set(pid, (unread.get(pid) || 0) + 1);
          }
        });
        chat.lastMessage = message._id;
        chat.unreadCounts = unread;
        await chat.save();

        // Broadcast to everyone in the room, including sender (so other sender tabs sync)
        io.to(chatId).emit("receive_message", { message });

        // Notify recipients who are NOT currently connected to this room.
        // (Recipients in the room already see the toast/badge update via receive_message;
        // this covers users on another page or fully offline, surfaced via GET /api/notifications.)
        const roomSockets = await io.in(chatId).fetchSockets();
        const inRoomUserIds = new Set(roomSockets.map((s) => String(s.user._id)));
        const previewText =
          type === "text" ? content?.slice(0, 80) : `sent a ${type}`;

        for (const participant of chat.participants) {
          const pid = String(participant);
          if (pid === userId || inRoomUserIds.has(pid)) continue;
          await createAndPushNotification(io, {
            recipient: pid,
            sender: userId,
            type: "message",
            chat: chatId,
            message: message._id,
            text: `${socket.user.username}: ${previewText}`,
          });
        }

        // Acknowledge to the sender's specific socket for optimistic-UI reconciliation
        if (typeof ack === "function") ack({ success: true, message });
      } catch (err) {
        console.error("send_message error:", err.message);
        socket.emit("error", { message: "Failed to send message" });
        if (typeof ack === "function") ack({ success: false, message: "Failed to send message" });
      }
    });

    // --- Forwarding (real-time push to destination chats) ------------------
    socket.on("forward_message", async ({ messageId, chatIds }, ack) => {
      try {
        const original = await Message.findById(messageId);
        if (!original || original.isDeleted) {
          return socket.emit("error", { message: "Message not found" });
        }

        const results = [];
        for (const chatId of chatIds) {
          const chat = await Chat.findById(chatId);
          if (!chat || !chat.participants.some((p) => String(p) === userId)) continue;

          const copy = await Message.create({
            chat: chatId,
            sender: userId,
            type: original.type,
            content: original.content,
            attachment: original.attachment,
            deliveredTo: [userId],
          });
          await copy.populate("sender", "username avatar");
          chat.lastMessage = copy._id;
          await chat.save();

          io.to(chatId).emit("receive_message", { message: copy });
          results.push(copy);
        }

        if (typeof ack === "function") ack({ success: true, forwarded: results });
      } catch (err) {
        console.error("forward_message error:", err.message);
        if (typeof ack === "function") ack({ success: false, message: "Failed to forward message" });
      }
    });

    // --- Typing indicators ---------------------------------------------
    socket.on("typing", ({ chatId }) => {
      socket.to(chatId).emit("typing", { chatId, userId, username: socket.user.username });
    });

    socket.on("stop_typing", ({ chatId }) => {
      socket.to(chatId).emit("stop_typing", { chatId, userId });
    });

    // --- Delivery / read receipts ---------------------------------------
    socket.on("message_seen", async ({ chatId, messageIds }) => {
      try {
        if (!Array.isArray(messageIds) || messageIds.length === 0) return;

        await Message.updateMany(
          { _id: { $in: messageIds }, chat: chatId },
          { $addToSet: { seenBy: userId, deliveredTo: userId } }
        );

        // Reset this user's unread counter for the chat
        await Chat.findByIdAndUpdate(chatId, { $set: { [`unreadCounts.${userId}`]: 0 } });

        socket.to(chatId).emit("message_seen", { chatId, messageIds, userId });
      } catch (err) {
        console.error("message_seen error:", err.message);
      }
    });

    // --- Disconnect -------------------------------------------------------
    socket.on("disconnect", async () => {
      console.log(`Socket disconnected: ${socket.id} (user ${socket.user.username})`);
      removeUserSocket(userId, socket.id);

      // Only mark offline in DB once ALL of this user's sockets are gone
      if (!isUserOnline(userId)) {
        const lastSeen = new Date();
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });
        socket.broadcast.emit("user_offline", { userId, lastSeen });
      }
    });
  });
};

module.exports = registerSocketHandlers;
