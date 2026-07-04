const Call = require("../models/Call");
const { assertParticipant } = require("../controllers/messageController");
const { catchAsync } = require("../middleware/errorMiddleware");

// @desc    Get call history for a chat
// @route   GET /api/calls/:chatId
const getCallHistory = catchAsync(async (req, res) => {
  await assertParticipant(req.params.chatId, req.user._id);

  const calls = await Call.find({ chat: req.params.chatId })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("caller", "username avatar")
    .populate("participants", "username avatar");

  res.json({ success: true, calls });
});

module.exports = { getCallHistory };
