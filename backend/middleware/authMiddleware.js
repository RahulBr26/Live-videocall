const { verifyAccessToken } = require("../utils/generateTokens");
const User = require("../models/User");

/**
 * Protects routes by requiring a valid access token in the
 * Authorization header: "Bearer <token>".
 * Attaches the authenticated user (minus password) to req.user.
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Not authorized, no token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: "User no longer exists" });
    }
    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: "Your account has been blocked" });
    }

    req.user = user;
    next();
  } catch (error) {
    // Distinguish expired tokens so the frontend knows to call /refresh
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Access token expired", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ success: false, message: "Not authorized, invalid token" });
  }
};

/**
 * Restricts a route to specific roles, e.g. restrictTo("admin").
 * Must be used after `protect`.
 */
const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "You do not have permission for this action" });
  }
  next();
};

module.exports = { protect, restrictTo };
