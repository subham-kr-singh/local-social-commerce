import multer from "multer";

const imageMime = /^image\/(jpeg|png|webp|gif)$/i;
const videoMime = /^video\/(mp4|webm|quicktime|x-m4v|x-msvideo|mpeg)$/i;

export const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (imageMime.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only image uploads are allowed"));
  },
});

export const uploadMemoryMedia = multer({
  storage: multer.memoryStorage(),
  // Allow larger uploads for videos; still keeps memory usage bounded.
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (imageMime.test(file.mimetype) || videoMime.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only image/video uploads are allowed"));
  },
});

export const uploadMemoryImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (imageMime.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only image uploads are allowed"));
  },
});
