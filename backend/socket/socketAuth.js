const { verifyAccessToken } = require("../utils/generateTokens");
const User = require("../models/User");

/**
 * Verifies the access token sent by the client during the Socket.IO
 * handshake (socket.handshake.auth.token) and attaches the user to
 * socket.user. Rejects the connection if invalid.
 */
const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication error: no token provided"));
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id).select("username avatar isOnline");

    if (!user) {
      return next(new Error("Authentication error: user not found"));
    }

    socket.user = user;
    next();
  } catch (err) {
    next(new Error("Authentication error: invalid or expired token"));
  }
};

module.exports = socketAuthMiddleware;
