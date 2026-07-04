const User = require("../models/User");
const Message = require("../models/Message");
const Chat = require("../models/Chat");
const { catchAsync } = require("../middleware/errorMiddleware");

// @desc    List all users (paginated)
// @route   GET /api/admin/users?page=1&limit=50
const listUsers = catchAsync(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);

  const users = await User.find()
    .select("username email avatar isOnline isBlocked role createdAt")
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ createdAt: -1 });

  const total = await User.countDocuments();
  res.json({ success: true, users, pagination: { page, limit, total } });
});

// @desc    Block or unblock a user
// @route   PATCH /api/admin/users/:userId/block
const toggleBlockUser = catchAsync(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  user.isBlocked = !user.isBlocked;
  if (user.isBlocked) user.refreshTokens = []; // force logout everywhere
  await user.save({ validateBeforeSave: false });

  res.json({ success: true, isBlocked: user.isBlocked });
});

// @desc    Admin force-delete any message (moderation)
// @route   DELETE /api/admin/messages/:messageId
const adminDeleteMessage = catchAsync(async (req, res) => {
  const message = await Message.findById(req.params.messageId);
  if (!message) return res.status(404).json({ success: false, message: "Message not found" });

  message.isDeleted = true;
  message.content = "[removed by moderator]";
  message.attachment = undefined;
  await message.save();

  res.json({ success: true, message: "Message removed by moderator" });
});

// @desc    Basic platform analytics
// @route   GET /api/admin/analytics
const getAnalytics = catchAsync(async (req, res) => {
  const [totalUsers, onlineUsers, totalChats, totalGroups, totalMessages, last7DaysMessages] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isOnline: true }),
      Chat.countDocuments({ isGroup: false }),
      Chat.countDocuments({ isGroup: true }),
      Message.countDocuments({ isDeleted: false }),
      Message.countDocuments({
        isDeleted: false,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

  res.json({
    success: true,
    analytics: { totalUsers, onlineUsers, totalChats, totalGroups, totalMessages, last7DaysMessages },
  });
});

module.exports = { listUsers, toggleBlockUser, adminDeleteMessage, getAnalytics };
