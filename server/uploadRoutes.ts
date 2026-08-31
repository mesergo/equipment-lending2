import { Router } from 'express';
import type { Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { requireAuth } from './auth';
import type { AuthedRequest } from './auth';

// Uploaded images (organization logos, model photos) live in a root-level `uploads/` folder —
// a sibling of `server/`, `dist/` and `server-build/`, not inside any of them, so re-deploying
// the built server or frontend (a full folder re-upload over SFTP) never touches previously
// uploaded files. Created on first use; gitignored like server/data/.
export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${ALLOWED_MIME_TYPES[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES[file.mimetype]) {
      cb(new Error('סוג קובץ לא נתמך — יש להעלות תמונה (PNG/JPEG/WebP/GIF)'));
      return;
    }
    cb(null, true);
  },
});

export const uploadRouter = Router();

// Any logged-in staff member can upload — the entity the image ends up attached to (an
// organization's logo, a model's photo) is still gated by that entity's own PATCH/POST
// permission check, same as pasting a URL by hand would have been.
uploadRouter.post('/uploads/image', requireAuth, async (req: AuthedRequest, res: Response) => {
  upload.single('file')(req, res, (err: unknown) => {
    if (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'העלאה נכשלה' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'לא נשלח קובץ' });
      return;
    }
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});
