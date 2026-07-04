const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  createGroup,
  editGroup,
  deleteGroup,
  addMembers,
  removeMember,
  promoteAdmin,
  leaveGroup,
} = require("../controllers/groupController");

const router = express.Router();

router.use(protect);

router.post("/", createGroup);
router.patch("/:groupId", editGroup);
router.delete("/:groupId", deleteGroup);
router.post("/:groupId/members", addMembers);
router.delete("/:groupId/members/:userId", removeMember);
router.post("/:groupId/admins/:userId", promoteAdmin);
router.post("/:groupId/leave", leaveGroup);

module.exports = router;
