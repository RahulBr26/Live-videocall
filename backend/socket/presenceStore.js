/**
 * In-memory presence map: userId -> Set of socket.ids.
 * A user is "online" if this set is non-empty.
 *
 * NOTE: For multi-instance scaling (multiple Node processes behind a load
 * balancer), this in-memory map must be replaced with Redis (e.g. a Redis
 * Hash or Set per user, shared across instances) — see Redis adapter notes
 * in server.js. For a single-instance deployment this is sufficient.
 */
const userSockets = new Map();

const addUserSocket = (userId, socketId) => {
  const id = String(userId);
  if (!userSockets.has(id)) userSockets.set(id, new Set());
  userSockets.get(id).add(socketId);
};

const removeUserSocket = (userId, socketId) => {
  const id = String(userId);
  const set = userSockets.get(id);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) userSockets.delete(id);
};

const isUserOnline = (userId) => userSockets.has(String(userId));

const getUserSocketIds = (userId) => Array.from(userSockets.get(String(userId)) || []);

const getOnlineUserIds = () => Array.from(userSockets.keys());

module.exports = {
  addUserSocket,
  removeUserSocket,
  isUserOnline,
  getUserSocketIds,
  getOnlineUserIds,
};
