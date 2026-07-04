const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["text", "image", "video", "audio", "voice", "file"],
      default: "text",
    },
    content: { type: String, trim: true, maxlength: 5000 }, // text body or caption

    // Populated when type !== "text"
    attachment: {
      url: String,
      publicId: String,
      fileName: String,
      fileSize: Number,
      mimeType: String,
      duration: Number, // for audio/voice/video, in seconds
    },

    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },

    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String },
      },
    ],

    deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false }, // soft delete, preserves chat history shape
    isPinned: { type: Boolean, default: false },

    starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

messageSchema.index({ chat: 1, createdAt: -1 }); // for paginated/infinite-scroll fetch
messageSchema.index({ content: "text" }); // for search

module.exports = mongoose.model("Message", messageSchema);
