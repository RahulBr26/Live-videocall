const cloudinary = require("../config/cloudinary");

/**
 * Maps a MIME type to the Cloudinary resource_type it should be uploaded as.
 * "raw" covers documents/zips/etc that aren't natively image/video.
 */
const resolveResourceType = (mimeType) => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "video"; // Cloudinary treats audio under "video" pipeline
  return "raw";
};

/**
 * Uploads a buffer (from multer memoryStorage) to Cloudinary via an
 * upload_stream, returning a promise that resolves with the result.
 */
const uploadBufferToCloudinary = (buffer, { folder, mimeType, fileName }) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resolveResourceType(mimeType),
        public_id: fileName ? fileName.replace(/\.[^/.]+$/, "") : undefined,
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

const deleteFromCloudinary = (publicId, resourceType = "image") => {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

module.exports = { uploadBufferToCloudinary, deleteFromCloudinary, resolveResourceType };
