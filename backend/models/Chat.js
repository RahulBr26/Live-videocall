const mongoose = require("mongoose");

/**
 * A Chat represents either:
 *  - a 1-to-1 conversation (isGroup: false, exactly 2 participants), or
 *  - a group conversation (isGroup: true)
 */
const chatSchema = new mongoose.Schema(
  {
    isGroup: { type: Boolean, default: false },

    // Group-only fields
    groupName: { type: String, trim: true, maxlength: 100 },
    groupDescription: { type: String, maxlength: 300 },
    groupAvatar: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ],

    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },

    // Per-user unread counters: { userId: count }
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

chatSchema.index({ participants: 1 });

module.exports = mongoose.model("Chat", chatSchema);
