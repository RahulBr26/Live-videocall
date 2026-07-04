const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId; // password not required for Google OAuth accounts
      },
      minlength: 8,
      select: false, // never return password by default
    },
    googleId: { type: String, unique: true, sparse: true },
    avatar: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" }, // for Cloudinary deletion
    },
    bio: { type: String, maxlength: 200, default: "" },
    statusMessage: { type: String, maxlength: 100, default: "" },

    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    emailVerificationExpires: Date,

    passwordResetToken: String,
    passwordResetExpires: Date,

    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isBlocked: { type: Boolean, default: false },

    refreshTokens: [{ type: String, select: false }], // supports multi-device login
  },
  { timestamps: true }
);

// Hash password before saving, only if it was modified
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method to compare plaintext password with the hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false; // OAuth-only account, no password set
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate a random token for email verification, hash it for storage,
// return the unhashed version to send to the user via email.
userSchema.methods.createEmailVerificationToken = function () {
  const token = crypto.randomBytes(32).toString("hex");
  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24h
  return token;
};

userSchema.methods.createPasswordResetToken = function () {
  const token = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1h
  return token;
};

module.exports = mongoose.model("User", userSchema);
