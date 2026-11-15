const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ApiError = require("../utils/ApiError");

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Extension comes from the validated MIME type, never from the client's file name.
const EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) =>
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${EXT[file.mimetype] || ".bin"}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(new ApiError(400, "Only JPG, PNG, WEBP and GIF images are allowed")),
});

const removeUpload = (imagePath) => {
  if (!imagePath || !imagePath.startsWith("/uploads/")) return;
  const file = path.join(uploadDir, path.basename(imagePath));
  fs.unlink(file, () => {});
};

module.exports = { upload, removeUpload, uploadDir };
