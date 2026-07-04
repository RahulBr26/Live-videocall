const express = require("express");
const rateLimit = require("express-rate-limit");
const {
  register,
  verifyEmail,
  login,
  googleLogin,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const {
  validate,
  registerRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
} = require("../middleware/validators");

const router = express.Router();

// Tighter rate limit on auth endpoints to slow down brute-force/credential-stuffing attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", authLimiter, registerRules, validate, register);
router.post("/verify-email", verifyEmail);
router.post("/login", authLimiter, loginRules, validate, login);
router.post("/google", authLimiter, googleLogin);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/forgot-password", authLimiter, forgotPasswordRules, validate, forgotPassword);
router.post("/reset-password", resetPasswordRules, validate, resetPassword);
router.get("/me", protect, getMe);

module.exports = router;
