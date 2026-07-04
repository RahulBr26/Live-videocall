const mongoose = require("mongoose");
const dns = require("dns");

const configureDns = () => {
  const configuredServers = (process.env.DNS_SERVERS || "")
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean);

  if (configuredServers.length > 0) {
    dns.setServers(configuredServers);
    return;
  }

  const currentServers = dns.getServers();
  const onlyLocalDns =
    currentServers.length > 0 &&
    currentServers.every((server) => server === "127.0.0.1" || server === "::1");

  if (onlyLocalDns) {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
  }
};

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not set");
    }

    configureDns();
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
