const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getMessages,
  editMessage,
  deleteMessage,
  toggleReaction,
  togglePin,
  toggleStar,
  forwardMessage,
  searchMessagesInChat,
} = require("../controllers/messageController");

const router = express.Router();

router.use(protect);

router.get("/:chatId", getMessages);
router.get("/:chatId/search", searchMessagesInChat);
router.patch("/:messageId", editMessage);
router.delete("/:messageId", deleteMessage);
router.post("/:messageId/reactions", toggleReaction);
router.post("/:messageId/pin", togglePin);
router.post("/:messageId/star", toggleStar);
router.post("/:messageId/forward", forwardMessage);

module.exports = router;
