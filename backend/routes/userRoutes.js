const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { searchUsers, updateProfile } = require("../controllers/userController");

const router = express.Router();

router.use(protect);

router.get("/search", searchUsers);
router.patch("/me", updateProfile);

module.exports = router;
