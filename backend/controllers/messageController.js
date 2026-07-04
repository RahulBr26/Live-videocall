const Message = require("../models/Message");
const Chat = require("../models/Chat");
const { catchAsync } = require("../middleware/errorMiddleware");

const assertParticipant = async (chatId, userId) => {
  const chat = await Chat.findById(chatId);
  if (!chat) {
    const err = new Error("Chat not found");
    err.statusCode = 404;
    throw err;
  }
  if (!chat.participants.some((p) => String(p) === String(userId))) {
    const err = new Error("You are not a participant in this chat");
    err.statusCode = 403;
    throw err;
  }
  return chat;
};

// @desc    Get paginated messages for a chat (infinite scroll, newest first then reversed on client)
// @route   GET /api/messages/:chatId?page=1&limit=30
const getMessages = catchAsync(async (req, res) => {
  const { chatId } = req.params;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 30, 100);

  await assertParticipant(chatId, req.user._id);

  const messages = await Message.find({ chat: chatId, isDeleted: false })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("sender", "username avatar")
    .populate({ path: "replyTo", populate: { path: "sender", select: "username" } });

  const total = await Message.countDocuments({ chat: chatId, isDeleted: false });

  res.json({
    success: true,
    messages: messages.reverse(), // chronological order for the client
    pagination: { page, limit, total, hasMore: page * limit < total },
  });
});

// @desc    Edit a message (sender only)
// @route   PATCH /api/messages/:messageId
const editMessage = catchAsync(async (req, res) => {
  const { content } = req.body;
  const message = await Message.findById(req.params.messageId);

  if (!message || message.isDeleted) {
    return res.status(404).json({ success: false, message: "Message not found" });
  }
  if (String(message.sender) !== String(req.user._id)) {
    return res.status(403).json({ success: false, message: "You can only edit your own messages" });
  }
  if (message.type !== "text") {
    return res.status(400).json({ success: false, message: "Only text messages can be edited" });
  }

  message.content = content;
  message.isEdited = true;
  await message.save();

  res.json({ success: true, message });
});

// @desc    Soft-delete a message (sender only)
// @route   DELETE /api/messages/:messageId
const deleteMessage = catchAsync(async (req, res) => {
  const message = await Message.findById(req.params.messageId);

  if (!message || message.isDeleted) {
    return res.status(404).json({ success: false, message: "Message not found" });
  }
  if (String(message.sender) !== String(req.user._id)) {
    return res.status(403).json({ success: false, message: "You can only delete your own messages" });
  }

  message.isDeleted = true;
  message.content = "";
  message.attachment = undefined;
  await message.save();

  res.json({ success: true, message: "Message deleted" });
});

// @desc    Toggle an emoji reaction on a message (adds if absent, removes if same user+emoji exists)
// @route   POST /api/messages/:messageId/reactions
// @body    { emoji }
const toggleReaction = catchAsync(async (req, res) => {
  const { emoji } = req.body;
  if (!emoji) {
    return res.status(400).json({ success: false, message: "emoji is required" });
  }

  const message = await Message.findById(req.params.messageId);
  if (!message || message.isDeleted) {
    return res.status(404).json({ success: false, message: "Message not found" });
  }
  await assertParticipant(message.chat, req.user._id);

  const existingIndex = message.reactions.findIndex(
    (r) => String(r.user) === String(req.user._id) && r.emoji === emoji
  );

  if (existingIndex >= 0) {
    message.reactions.splice(existingIndex, 1); // un-react
  } else {
    // Replace any other reaction by this user with the new one (one reaction per user, like most chat apps)
    message.reactions = message.reactions.filter((r) => String(r.user) !== String(req.user._id));
    message.reactions.push({ user: req.user._id, emoji });
  }

  await message.save();
  res.json({ success: true, reactions: message.reactions });
});

// @desc    Pin or unpin a message (toggle)
// @route   POST /api/messages/:messageId/pin
const togglePin = catchAsync(async (req, res) => {
  const message = await Message.findById(req.params.messageId);
  if (!message || message.isDeleted) {
    return res.status(404).json({ success: false, message: "Message not found" });
  }
  await assertParticipant(message.chat, req.user._id);

  message.isPinned = !message.isPinned;
  await message.save();

  res.json({ success: true, isPinned: message.isPinned });
});

// @desc    Star or unstar a message for the current user only
// @route   POST /api/messages/:messageId/star
const toggleStar = catchAsync(async (req, res) => {
  const message = await Message.findById(req.params.messageId);
  if (!message || message.isDeleted) {
    return res.status(404).json({ success: false, message: "Message not found" });
  }
  await assertParticipant(message.chat, req.user._id);

  const userId = String(req.user._id);
  const isStarred = message.starredBy.some((id) => String(id) === userId);

  if (isStarred) {
    message.starredBy = message.starredBy.filter((id) => String(id) !== userId);
  } else {
    message.starredBy.push(req.user._id);
  }
  await message.save();

  res.json({ success: true, isStarred: !isStarred });
});

// @desc    Forward a message to one or more other chats
// @route   POST /api/messages/:messageId/forward
// @body    { chatIds: [] }
const forwardMessage = catchAsync(async (req, res) => {
  const { chatIds } = req.body;
  if (!Array.isArray(chatIds) || chatIds.length === 0) {
    return res.status(400).json({ success: false, message: "chatIds array is required" });
  }

  const original = await Message.findById(req.params.messageId);
  if (!original || original.isDeleted) {
    return res.status(404).json({ success: false, message: "Message not found" });
  }
  await assertParticipant(original.chat, req.user._id);

  const forwarded = [];
  for (const chatId of chatIds) {
    await assertParticipant(chatId, req.user._id); // must also belong to the destination chat

    const copy = await Message.create({
      chat: chatId,
      sender: req.user._id,
      type: original.type,
      content: original.content,
      attachment: original.attachment,
      deliveredTo: [req.user._id],
    });
    await Chat.findByIdAndUpdate(chatId, { lastMessage: copy._id });
    await copy.populate("sender", "username avatar");
    forwarded.push(copy);
  }

  res.status(201).json({ success: true, forwarded });
});

// @desc    Search messages within a chat by text content
// @route   GET /api/messages/:chatId/search?q=term
const searchMessagesInChat = catchAsync(async (req, res) => {
  const { chatId } = req.params;
  const q = (req.query.q || "").trim();
  await assertParticipant(chatId, req.user._id);

  if (!q) return res.json({ success: true, messages: [] });

  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const messages = await Message.find({
    chat: chatId,
    isDeleted: false,
    content: regex,
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("sender", "username avatar");

  res.json({ success: true, messages });
});

module.exports = {
  getMessages,
  editMessage,
  deleteMessage,
  assertParticipant,
  toggleReaction,
  togglePin,
  toggleStar,
  forwardMessage,
  searchMessagesInChat,
};
