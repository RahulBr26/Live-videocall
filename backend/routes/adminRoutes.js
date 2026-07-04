const express = require("express");
const { protect, restrictTo } = require("../middleware/authMiddleware");
const {
  listUsers,
  toggleBlockUser,
  adminDeleteMessage,
  getAnalytics,
} = require("../controllers/adminController");

const router = express.Router();

router.use(protect, restrictTo("admin"));

router.get("/users", listUsers);
router.patch("/users/:userId/block", toggleBlockUser);
router.delete("/messages/:messageId", adminDeleteMessage);
router.get("/analytics", getAnalytics);

module.exports = router;
