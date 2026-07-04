const Notification = require("../models/Notification");
const { getUserSocketIds } = require("../socket/presenceStore");

/**
 * Creates a Notification document and, if the recipient currently has any
 * active sockets, emits it to them immediately ("new_notification" event).
 * Offline users will see it next time they call GET /api/notifications.
 *
 * `io` must be passed in since this module has no direct socket server
 * reference (avoids circular require with chatSocket.js).
 */
const createAndPushNotification = async (io, { recipient, sender, type, chat, message, text }) => {
  const notification = await Notification.create({ recipient, sender, type, chat, message, text });
  const populated = await notification.populate("sender", "username avatar");

  const socketIds = getUserSocketIds(recipient);
  socketIds.forEach((id) => io.to(id).emit("new_notification", { notification: populated }));

  return populated;
};

module.exports = { createAndPushNotification };
