const { uploadBufferToCloudinary, resolveResourceType } = require("../services/uploadService");
const { catchAsync } = require("../middleware/errorMiddleware");
const Chat = require("../models/Chat");

// @desc    Upload a file/image/audio/video for a chat message
// @route   POST /api/uploads/chat/:chatId
const uploadChatAttachment = catchAsync(async (req, res) => {
  const { chatId } = req.params;

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file provided",
    });
  }

  const chat = await Chat.findById(chatId);

  if (!chat || !chat.participants.some((p) => String(p) === String(req.user._id))) {
    return res.status(403).json({
      success: false,
      message: "Not authorized for this chat",
    });
  }

  const result = await uploadBufferToCloudinary(req.file.buffer, {
    folder: `chatapp/chats/${chatId}`,
    mimeType: req.file.mimetype,
    fileName: req.file.originalname,
  });

  const resourceType = resolveResourceType(req.file.mimetype);

  const messageType = req.file.mimetype.startsWith("audio/")
    ? "voice"
    : resourceType === "image"
    ? "image"
    : resourceType === "video"
    ? "video"
    : "file";

  res.status(201).json({
    success: true,
    attachment: {
      url: result.secure_url,
      publicId: result.public_id,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      duration: result.duration || undefined,
    },
    suggestedType: messageType,
  });
});

// @desc    Upload/replace the current user's avatar
// @route   POST /api/uploads/avatar
const uploadAvatar = catchAsync(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file provided",
    });
  }

  if (!req.file.mimetype.startsWith("image/")) {
    return res.status(400).json({
      success: false,
      message: "Avatar must be an image",
    });
  }

  const result = await uploadBufferToCloudinary(req.file.buffer, {
    folder: `chatapp/avatars/${req.user._id}`,
    mimeType: req.file.mimetype,
    fileName: "avatar",
  });

  req.user.avatar = {
    url: result.secure_url,
    publicId: result.public_id,
  };

  await req.user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    avatar: req.user.avatar,
  });
});

module.exports = { uploadChatAttachment, uploadAvatar };