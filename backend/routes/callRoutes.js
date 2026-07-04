const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getCallHistory } = require("../controllers/callController");

const router = express.Router();

router.use(protect);
router.get("/:chatId", getCallHistory);

module.exports = router;
