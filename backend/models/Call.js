const mongoose = require("mongoose");

const callSchema = new mongoose.Schema(
  {
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
    caller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    type: { type: String, enum: ["audio", "video"], required: true },
    status: {
      type: String,
      enum: ["ringing", "ongoing", "ended", "missed", "rejected"],
      default: "ringing",
    },

    startedAt: { type: Date, default: Date.now },
    endedAt: Date,
    durationSeconds: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Call", callSchema);
