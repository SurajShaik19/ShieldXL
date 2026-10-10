import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';

// Ensure upload directory exists
if (!fs.existsSync(config.uploads.dir)) {
  fs.mkdirSync(config.uploads.dir, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.uploads.dir);
  },
  filename: (_req, file, cb) => {
    // Generate safe UUID filename preventing path traversal
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${uuidv4()}${ext}`;
    cb(null, safeName);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: config.uploads.maxSizeMb * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WEBP, MP4, WEBM, MOV.`));
    }
  },
});
