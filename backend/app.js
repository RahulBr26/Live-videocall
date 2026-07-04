const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const xssClean = require("xss-clean");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const userRoutes = require("./routes/userRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const groupRoutes = require("./routes/groupRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const callRoutes = require("./routes/callRoutes");
const { errorHandler } = require("./middleware/errorMiddleware");

const app = express();

app.set("trust proxy", 1);

const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedVercelOrigin = (origin) => {
  try {
    const { hostname, protocol } = new URL(origin);
    return (
      protocol === "https:" &&
      (hostname === "live-videocall.vercel.app" ||
        (hostname.startsWith("live-videocall-") &&
          hostname.endsWith("-rahulbr26s-projects.vercel.app")))
    );
  } catch {
    return false;
  }
};

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || isAllowedVercelOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true, // allow the refresh-token cookie to be sent
};

// --- Security middleware ------------------------------------------------
app.use(helmet());
app.use(cors(corsOptions));
app.use(xssClean()); // sanitizes req.body/query/params against XSS payloads

// General API rate limit (auth routes have their own stricter limiter)
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// --- Body parsing ---------------------------------------------------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// --- Routes ----------------------------------------------------------------
app.get("/api/health", (req, res) => res.json({ success: true, status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/calls", callRoutes);

// 404 fallback for unmatched API routes
app.use("/api", (req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Centralized error handler (must be last)
app.use(errorHandler);

module.exports = app;
