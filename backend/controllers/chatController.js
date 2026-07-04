const Chat = require("../models/Chat");
const User = require("../models/User");
const { catchAsync } = require("../middleware/errorMiddleware");

// @desc    Get or create a 1-to-1 chat with another user
// @route   POST /api/chats/one-to-one
// @body    { userId }
const accessOneToOneChat = catchAsync(async (req, res) => {
  const { userId } = req.body;
  const myId = req.user._id;

  if (!userId) {
    return res.status(400).json({ success: false, message: "userId is required" });
  }
  if (userId === String(myId)) {
    return res.status(400).json({ success: false, message: "Cannot start a chat with yourself" });
  }

  const otherUser = await User.findById(userId);
  if (!otherUser) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // Look for an existing 1-to-1 chat containing exactly these two participants
  let chat = await Chat.findOne({
    isGroup: false,
    participants: { $all: [myId, userId], $size: 2 },
  })
    .populate("participants", "username avatar isOnline lastSeen")
    .populate("lastMessage");

  if (!chat) {
    chat = await Chat.create({
      isGroup: false,
      participants: [myId, userId],
    });
    chat = await chat.populate("participants", "username avatar isOnline lastSeen");
  }

  res.json({ success: true, chat });
});

// @desc    List all chats for the logged-in user, sorted by most recent activity
// @route   GET /api/chats
const getMyChats = catchAsync(async (req, res) => {
  const chats = await Chat.find({ participants: req.user._id })
    .populate("participants", "username avatar isOnline lastSeen")
    .populate({
      path: "lastMessage",
      populate: { path: "sender", select: "username" },
    })
    .sort({ updatedAt: -1 });

  res.json({ success: true, chats });
});

// @desc    Get a single chat by id (must be a participant)
// @route   GET /api/chats/:chatId
const getChatById = catchAsync(async (req, res) => {
  const chat = await Chat.findById(req.params.chatId).populate(
    "participants",
    "username avatar isOnline lastSeen"
  );

  if (!chat) {
    return res.status(404).json({ success: false, message: "Chat not found" });
  }
  if (!chat.participants.some((p) => String(p._id) === String(req.user._id))) {
    return res.status(403).json({ success: false, message: "You are not a participant in this chat" });
  }

  res.json({ success: true, chat });
});

module.exports = { accessOneToOneChat, getMyChats, getChatById };
