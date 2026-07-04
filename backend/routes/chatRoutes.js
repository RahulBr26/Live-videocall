const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  accessOneToOneChat,
  getMyChats,
  getChatById,
} = require("../controllers/chatController");

const router = express.Router();

router.use(protect); // every route below requires authentication

router.post("/one-to-one", accessOneToOneChat);
router.get("/", getMyChats);
router.get("/:chatId", getChatById);

module.exports = router;
