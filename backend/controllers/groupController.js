const Chat = require("../models/Chat");
const { catchAsync } = require("../middleware/errorMiddleware");

const isAdmin = (chat, userId) => chat.admins.some((a) => String(a) === String(userId));

// @desc    Create a group chat
// @route   POST /api/groups
// @body    { groupName, groupDescription?, participantIds: [] }
const createGroup = catchAsync(async (req, res) => {
  const { groupName, groupDescription, participantIds } = req.body;

  if (!groupName || !Array.isArray(participantIds) || participantIds.length < 1) {
    return res.status(400).json({
      success: false,
      message: "groupName and at least one other participant are required",
    });
  }

  const uniqueParticipants = Array.from(new Set([...participantIds, String(req.user._id)]));

  const group = await Chat.create({
    isGroup: true,
    groupName,
    groupDescription,
    participants: uniqueParticipants,
    admins: [req.user._id], // creator is the first admin
  });

  await group.populate("participants", "username avatar isOnline");
  res.status(201).json({ success: true, group });
});

// @desc    Edit group name/description (admin only)
// @route   PATCH /api/groups/:groupId
const editGroup = catchAsync(async (req, res) => {
  const group = await Chat.findById(req.params.groupId);
  if (!group || !group.isGroup) {
    return res.status(404).json({ success: false, message: "Group not found" });
  }
  if (!isAdmin(group, req.user._id)) {
    return res.status(403).json({ success: false, message: "Only admins can edit the group" });
  }

  const { groupName, groupDescription } = req.body;
  if (groupName !== undefined) group.groupName = groupName;
  if (groupDescription !== undefined) group.groupDescription = groupDescription;
  await group.save();

  res.json({ success: true, group });
});

// @desc    Delete a group (admin only)
// @route   DELETE /api/groups/:groupId
const deleteGroup = catchAsync(async (req, res) => {
  const group = await Chat.findById(req.params.groupId);
  if (!group || !group.isGroup) {
    return res.status(404).json({ success: false, message: "Group not found" });
  }
  if (!isAdmin(group, req.user._id)) {
    return res.status(403).json({ success: false, message: "Only admins can delete the group" });
  }

  await group.deleteOne();
  res.json({ success: true, message: "Group deleted" });
});

// @desc    Add members (admin only)
// @route   POST /api/groups/:groupId/members
// @body    { userIds: [] }
const addMembers = catchAsync(async (req, res) => {
  const group = await Chat.findById(req.params.groupId);
  if (!group || !group.isGroup) {
    return res.status(404).json({ success: false, message: "Group not found" });
  }
  if (!isAdmin(group, req.user._id)) {
    return res.status(403).json({ success: false, message: "Only admins can add members" });
  }

  const { userIds } = req.body;
  const newSet = new Set([...group.participants.map(String), ...userIds]);
  group.participants = Array.from(newSet);
  await group.save();
  await group.populate("participants", "username avatar isOnline");

  res.json({ success: true, group });
});

// @desc    Remove a member (admin only; admins cannot remove themselves this way)
// @route   DELETE /api/groups/:groupId/members/:userId
const removeMember = catchAsync(async (req, res) => {
  const group = await Chat.findById(req.params.groupId);
  if (!group || !group.isGroup) {
    return res.status(404).json({ success: false, message: "Group not found" });
  }
  if (!isAdmin(group, req.user._id)) {
    return res.status(403).json({ success: false, message: "Only admins can remove members" });
  }

  const { userId } = req.params;
  group.participants = group.participants.filter((p) => String(p) !== userId);
  group.admins = group.admins.filter((a) => String(a) !== userId);
  await group.save();

  res.json({ success: true, message: "Member removed" });
});

// @desc    Promote a participant to admin (admin only)
// @route   POST /api/groups/:groupId/admins/:userId
const promoteAdmin = catchAsync(async (req, res) => {
  const group = await Chat.findById(req.params.groupId);
  if (!group || !group.isGroup) {
    return res.status(404).json({ success: false, message: "Group not found" });
  }
  if (!isAdmin(group, req.user._id)) {
    return res.status(403).json({ success: false, message: "Only admins can promote members" });
  }

  const { userId } = req.params;
  if (!group.participants.some((p) => String(p) === userId)) {
    return res.status(400).json({ success: false, message: "User is not a participant" });
  }
  if (!isAdmin(group, userId)) {
    group.admins.push(userId);
    await group.save();
  }

  res.json({ success: true, message: "User promoted to admin" });
});

// @desc    Leave a group (any participant)
// @route   POST /api/groups/:groupId/leave
const leaveGroup = catchAsync(async (req, res) => {
  const group = await Chat.findById(req.params.groupId);
  if (!group || !group.isGroup) {
    return res.status(404).json({ success: false, message: "Group not found" });
  }

  group.participants = group.participants.filter((p) => String(p) !== String(req.user._id));
  group.admins = group.admins.filter((a) => String(a) !== String(req.user._id));
  await group.save();

  res.json({ success: true, message: "You left the group" });
});

module.exports = {
  createGroup,
  editGroup,
  deleteGroup,
  addMembers,
  removeMember,
  promoteAdmin,
  leaveGroup,
};
