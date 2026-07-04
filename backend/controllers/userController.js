const User = require("../models/User");
const { catchAsync } = require("../middleware/errorMiddleware");

// @desc    Search users by username or email (excludes self)
// @route   GET /api/users/search?q=term
const searchUsers = catchAsync(async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) {
    return res.json({ success: true, users: [] });
  }

  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); // escape regex special chars

  const users = await User.find({
    _id: { $ne: req.user._id },
    $or: [{ username: regex }, { email: regex }],
  })
    .select("username email avatar isOnline lastSeen")
    .limit(20);

  res.json({ success: true, users });
});

// @desc    Update own profile (bio, status message, username)
// @route   PATCH /api/users/me
const updateProfile = catchAsync(async (req, res) => {
  const allowedFields = ["username", "bio", "statusMessage"];
  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.json({ success: true, user });
});

module.exports = { searchUsers, updateProfile };
