require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const connectDB = require("./config/db");
const registerSocketHandlers = require("./socket/chatSocket");

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

// NOTE on horizontal scaling:
// When running more than one Node instance behind a load balancer, attach
// the Redis adapter so Socket.IO events broadcast across all instances:
//
//   const { createAdapter } = require("@socket.io/redis-adapter");
//   const { createClient } = require("redis");
//   const pubClient = createClient({ url: process.env.REDIS_URL });
//   const subClient = pubClient.duplicate();
//   await Promise.all([pubClient.connect(), subClient.connect()]);
//   io.adapter(createAdapter(pubClient, subClient));
//
// Also replace presenceStore.js's in-memory Map with a Redis-backed store
// in that scenario, since each instance otherwise only knows about its own
// locally-connected sockets.

registerSocketHandlers(io);

const start = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
  });
};

start();

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => process.exit(0));
});
