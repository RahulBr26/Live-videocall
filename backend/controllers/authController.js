const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const { catchAsync } = require("../middleware/errorMiddleware");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/generateTokens");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("../services/emailService");

// Cookie options for the refresh token (httpOnly so JS can't read it -> mitigates XSS theft)
const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  path: "/api/auth", // only sent to auth routes
};

const sanitizeUser = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  avatar: user.avatar,
  bio: user.bio,
  statusMessage: user.statusMessage,
  isEmailVerified: user.isEmailVerified,
  role: user.role,
});

// @desc    Register a new user
// @route   POST /api/auth/register
const register = catchAsync(async (req, res) => {
  const { username, email, password } = req.body;

  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    return res.status(409).json({
      success: false,
      message: "A user with that email or username already exists",
    });
  }

  const user = await User.create({ username, email, password });

  const verificationToken = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  try {
    await sendVerificationEmail(user, verificationToken);
  } catch (err) {
    // Don't fail registration if email sending fails; log for ops visibility
    console.error("Failed to send verification email:", err.message);
  }

  res.status(201).json({
    success: true,
    message: "Registration successful. Please check your email to verify your account.",
    user: sanitizeUser(user),
  });
});

// @desc    Verify email via token from email link
// @route   POST /api/auth/verify-email
const verifyEmail = catchAsync(async (req, res) => {
  const { token } = req.body;
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ success: false, message: "Invalid or expired verification link" });
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  res.json({ success: true, message: "Email verified successfully. You can now log in." });
});

// @desc    Login
// @route   POST /api/auth/login
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password +refreshTokens");
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  if (user.isBlocked) {
    return res.status(403).json({ success: false, message: "Your account has been blocked" });
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Keep last 5 refresh tokens max (simple multi-device cap)
  user.refreshTokens = [...(user.refreshTokens || []), refreshToken].slice(-5);
  user.isOnline = true;
  await user.save({ validateBeforeSave: false });

  res.cookie("refreshToken", refreshToken, refreshCookieOptions);
  res.json({
    success: true,
    accessToken,
    user: sanitizeUser(user),
  });
});

// @desc    Issue a new access token using the refresh token cookie
// @route   POST /api/auth/refresh
const refresh = catchAsync(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return res.status(401).json({ success: false, message: "No refresh token provided" });
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
  }

  const user = await User.findById(decoded.id).select("+refreshTokens");
  if (!user || !user.refreshTokens.includes(token)) {
    return res.status(401).json({ success: false, message: "Refresh token not recognized" });
  }

  const accessToken = generateAccessToken(user._id);
  res.json({ success: true, accessToken });
});

// @desc    Logout: invalidate the refresh token (current device only)
// @route   POST /api/auth/logout
const logout = catchAsync(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (token) {
    try {
      const decoded = verifyRefreshToken(token);
      await User.findByIdAndUpdate(decoded.id, {
        $pull: { refreshTokens: token },
        isOnline: false,
        lastSeen: new Date(),
      });
    } catch {
      // token already invalid/expired -- nothing to clean up
    }
  }

  res.clearCookie("refreshToken", { path: "/api/auth" });
  res.json({ success: true, message: "Logged out successfully" });
});

// @desc    Request a password reset email
// @route   POST /api/auth/forgot-password
const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Always respond with success to avoid leaking which emails are registered
  if (!user) {
    return res.json({
      success: true,
      message: "If that email is registered, a reset link has been sent.",
    });
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    await sendPasswordResetEmail(user, resetToken);
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return res.status(500).json({ success: false, message: "Failed to send reset email, try again later" });
  }

  res.json({ success: true, message: "If that email is registered, a reset link has been sent." });
});

// @desc    Reset password using token from email
// @route   POST /api/auth/reset-password
const resetPassword = catchAsync(async (req, res) => {
  const { token, newPassword } = req.body;
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select("+refreshTokens");

  if (!user) {
    return res.status(400).json({ success: false, message: "Invalid or expired reset link" });
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshTokens = []; // force re-login on all devices after password change
  await user.save();

  res.json({ success: true, message: "Password reset successfully. Please log in." });
});

// @desc    Get currently authenticated user
// @route   GET /api/auth/me
const getMe = catchAsync(async (req, res) => {
  res.json({ success: true, user: sanitizeUser(req.user) });
});

// @desc    Login or register via Google OAuth. Client sends the Google ID
//          token obtained from Google's frontend SDK (One Tap / button flow).
// @route   POST /api/auth/google
// @body    { idToken }
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleLogin = catchAsync(async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ success: false, message: "idToken is required" });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid Google token" });
  }

  const { sub: googleId, email, name, picture } = payload;

  let user = await User.findOne({ $or: [{ googleId }, { email }] }).select("+refreshTokens");

  if (!user) {
    // Derive a unique-ish username from the email local-part; collisions are
    // rare enough for a demo app but in production you'd loop-check uniqueness.
    const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") || "user";
    const suffix = crypto.randomBytes(2).toString("hex");

    user = await User.create({
      username: `${baseUsername}_${suffix}`,
      email,
      googleId,
      avatar: { url: picture || "" },
      isEmailVerified: true, // Google already verified this email
    });
  } else if (!user.googleId) {
    // Existing email/password account signing in with Google for the first time -> link it
    user.googleId = googleId;
    user.isEmailVerified = true;
    await user.save({ validateBeforeSave: false });
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshTokens = [...(user.refreshTokens || []), refreshToken].slice(-5);
  user.isOnline = true;
  await user.save({ validateBeforeSave: false });

  res.cookie("refreshToken", refreshToken, refreshCookieOptions);
  res.json({ success: true, accessToken, user: sanitizeUser(user) });
});

module.exports = {
  register,
  verifyEmail,
  login,
  googleLogin,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
};
