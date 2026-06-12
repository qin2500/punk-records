import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { randomBytes } from 'crypto';

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../public/uploads'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomBytes(16).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/'));
  },
});

export const uploadRouter = Router();

uploadRouter.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file provided' });
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
  res.json({ url: `${apiBase}/uploads/${req.file.filename}` });
});
