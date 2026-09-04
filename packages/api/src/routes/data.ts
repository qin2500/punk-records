import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@punk-records/shared';
import type { ExportPayload, ImportSummary } from '@punk-records/shared';
import { listGuildChannels, createEmptyChannel, collageNameToChannelName } from '../services/discord';
import { emitWorkspaceImported } from '../socket/emitter';

const router = Router();

router.get('/export', async (_req, res) => {
  try {
    const collages = await prisma.collage.findMany({
      include: { cards: { where: { type: { not: 'IMAGE' } } } },
      orderBy: { createdAt: 'asc' },
    });

    const payload: ExportPayload = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      collages: collages.map((c) => ({
        id: c.id,
        name: c.name,
        discordChannelId: c.discordChannelId,
        isPrivate: c.isPrivate,
        createdAt: c.createdAt.toISOString(),
        cards: c.cards.map((card) => ({
          id: card.id,
          type: card.type as 'LINK' | 'NOTE',
          content: card.content,
          notes: card.notes,
          url: card.url,
          ogTitle: card.ogTitle,
          ogDescription: card.ogDescription,
          ogImage: card.ogImage,
          ogSiteName: card.ogSiteName,
          ogFavicon: card.ogFavicon,
          x: card.x,
          y: card.y,
          width: card.width,
          height: card.height,
          source: card.source,
          discordMessageId: card.discordMessageId,
          createdAt: card.createdAt.toISOString(),
        })),
      })),
    };

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="punk-records-export-${Date.now()}.json"`
    );
    res.json(payload);
  } catch {
    res.status(500).json({ error: 'Failed to export data' });
  }
});

const importCardSchema = z.object({
  id: z.string(),
  type: z.enum(['LINK', 'NOTE']),
  content: z.string().nullable(),
  notes: z.string().nullable(),
  url: z.string().nullable(),
  ogTitle: z.string().nullable(),
  ogDescription: z.string().nullable(),
  ogImage: z.string().nullable(),
  ogSiteName: z.string().nullable(),
  ogFavicon: z.string().nullable(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  source: z.enum(['DISCORD', 'WEBAPP']),
  discordMessageId: z.string().nullable(),
  createdAt: z.string(),
});

const importCollageSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  discordChannelId: z.string(),
  isPrivate: z.boolean(),
  createdAt: z.string(),
  cards: z.array(importCardSchema),
});

const importFileSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  collages: z.array(importCollageSchema),
});

router.post('/import', async (req, res) => {
  const parsed = importFileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const guildId = process.env.DISCORD_GUILD_ID;
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!guildId || !token) {
    return res.status(500).json({ error: 'DISCORD_GUILD_ID / DISCORD_BOT_TOKEN not configured' });
  }

  const { collages } = parsed.data;
  const warnings: string[] = [];
  let channelsCreated = 0;

  try {
    const liveChannels = await listGuildChannels(guildId, token);
    const liveIds = new Set(liveChannels.map((c) => c.id));

    const reconciled = [];
    for (const collage of collages) {
      if (liveIds.has(collage.discordChannelId)) {
        reconciled.push(collage);
        continue;
      }
      const channelName = collageNameToChannelName(collage.name, collage.isPrivate);
      const created = await createEmptyChannel(guildId, token, channelName);
      channelsCreated += 1;
      warnings.push(
        `Collage "${collage.name}" (${collage.id}): no live channel found, created #${created.name}`
      );
      reconciled.push({ ...collage, discordChannelId: created.id });
    }

    await prisma.$transaction([
      prisma.card.deleteMany({}),
      prisma.collage.deleteMany({}),
      ...reconciled.map((collage) =>
        prisma.collage.create({
          data: {
            id: collage.id,
            name: collage.name,
            discordChannelId: collage.discordChannelId,
            isPrivate: collage.isPrivate,
            createdAt: new Date(collage.createdAt),
            cards: {
              create: collage.cards.map((card) => ({
                id: card.id,
                type: card.type,
                content: card.content,
                notes: card.notes,
                url: card.url,
                ogTitle: card.ogTitle,
                ogDescription: card.ogDescription,
                ogImage: card.ogImage,
                ogSiteName: card.ogSiteName,
                ogFavicon: card.ogFavicon,
                x: card.x,
                y: card.y,
                width: card.width,
                height: card.height,
                source: card.source,
                discordMessageId: card.discordMessageId,
                createdAt: new Date(card.createdAt),
              })),
            },
          },
        })
      ),
    ]);

    emitWorkspaceImported();

    const summary: ImportSummary = {
      collagesImported: reconciled.length,
      cardsImported: reconciled.reduce((sum, c) => sum + c.cards.length, 0),
      channelsCreated,
      warnings,
    };
    res.json(summary);
  } catch (err) {
    res.status(502).json({
      error: 'Import failed before any existing data was touched',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
