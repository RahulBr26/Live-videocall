const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { uploadChatAttachment, uploadAvatar } = require("../controllers/uploadController");

const router = express.Router();

router.use(protect);

router.post("/chat/:chatId", upload.single("file"), uploadChatAttachment);
router.post("/avatar", upload.single("file"), uploadAvatar);

module.exports = router;
