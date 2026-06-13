import { Router } from 'express';
import multer from 'multer';
import { prisma } from '@punk-records/shared';

// Keep file in memory — we forward it straight to Discord, no disk writes
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/'));
  },
});

export const uploadRouter = Router();

uploadRouter.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file provided' });

  const collageId = req.body.collageId as string | undefined;
  if (!collageId) return res.status(400).json({ error: 'collageId is required' });

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return res.status(500).json({ error: 'DISCORD_BOT_TOKEN not configured' });

  const collage = await prisma.collage.findUnique({ where: { id: collageId } });
  if (!collage) return res.status(404).json({ error: 'Collage not found' });

  // Post the image to the collage's Discord channel as the bot.
  // The bot's messageCreate handler ignores messages from bot users, so no duplicate card.
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(req.file.buffer)], { type: req.file.mimetype });
  formData.append('files[0]', blob, req.file.originalname || 'image');

  const discordRes = await fetch(
    `https://discord.com/api/v10/channels/${collage.discordChannelId}/messages`,
    {
      method: 'POST',
      headers: { Authorization: `Bot ${token}` },
      body: formData,
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!discordRes.ok) {
    const text = await discordRes.text();
    console.error('Discord upload failed:', text);
    return res.status(502).json({ error: 'Failed to upload to Discord' });
  }

  const msg = await discordRes.json() as { attachments?: Array<{ url: string }> };
  const url = msg.attachments?.[0]?.url;
  if (!url) return res.status(502).json({ error: 'Discord returned no attachment URL' });

  res.json({ url });
});
