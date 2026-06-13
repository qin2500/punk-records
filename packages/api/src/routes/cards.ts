import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@punk-records/shared';
import { goldenAnglePosition } from '../services/layout';
import { scrapeOg } from '../services/og-scraper';
import {
  emitCardCreated,
  emitCardUpdated,
  emitCardDeleted,
  emitCardMoved,
} from '../socket/emitter';
import type { Card } from '@punk-records/shared';
import type { Card as PrismaCard } from '@prisma/client';

const URL_REGEX = /^https?:\/\//i;

// Mounted at /api/collages — collage-scoped card routes
export const collageCardsRouter = Router({ mergeParams: true });

collageCardsRouter.get('/:collageId/cards', async (req, res) => {
  try {
    const cards = await prisma.card.findMany({
      where: { collageId: req.params.collageId },
      orderBy: { createdAt: 'asc' },
    });
    res.json(cards);
  } catch {
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

const createCardSchema = z.union([
  z.object({ type: z.literal('NOTE'), content: z.string().min(1) }),
  z.object({ type: z.literal('LINK'), content: z.string().min(1) }),
  z.object({ type: z.literal('IMAGE'), url: z.string().url(), notes: z.string().optional() }),
]);

collageCardsRouter.post('/:collageId/cards', async (req, res) => {
  const parsed = createCardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { collageId } = req.params;

  try {
    const collage = await prisma.collage.findUnique({
      where: { id: collageId },
      include: { _count: { select: { cards: true } } },
    });
    if (!collage) return res.status(404).json({ error: 'Collage not found' });

    const n = collage._count.cards;
    const { x, y } = goldenAnglePosition(n);

    let card: PrismaCard;

    if (parsed.data.type === 'IMAGE') {
      card = await prisma.card.create({
        data: {
          collageId,
          type: 'IMAGE',
          url: parsed.data.url,
          notes: parsed.data.notes ?? null,
          x, y,
          source: 'WEBAPP',
        },
      });
    } else {
      const { content } = parsed.data;
      const isLink = parsed.data.type === 'LINK' || URL_REGEX.test(content);
      const cardType = isLink ? ('LINK' as const) : ('NOTE' as const);
      const url = isLink ? content : null;

      card = await prisma.card.create({
        data: { collageId, type: cardType, content, url, x, y, source: 'WEBAPP' },
      });

      if (isLink && url) {
        scrapeOg(url).then(async (ogData) => {
          if (Object.keys(ogData).length === 0) return;
          const updated = await prisma.card.update({
            where: { id: card.id },
            data: {
              ogTitle: ogData.ogTitle ?? null,
              ogDescription: ogData.ogDescription ?? null,
              ogImage: ogData.ogImage ?? null,
              ogSiteName: ogData.ogSiteName ?? null,
              ogFavicon: ogData.ogFavicon ?? null,
            },
          });
          emitCardUpdated(collageId, card.id, updated as unknown as Partial<Card>);
        }).catch(() => {});
      }
    }

    emitCardCreated(collageId, card as unknown as Card);
    res.status(201).json(card);
  } catch {
    res.status(500).json({ error: 'Failed to create card' });
  }
});

// Mounted at /api/cards — individual card routes
export const cardRouter = Router({ mergeParams: true });

const moveSchema = z.object({
  x: z.number(),
  y: z.number(),
});

cardRouter.patch('/:cardId/position', async (req, res) => {
  const parsed = moveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const card = await prisma.card.update({
      where: { id: req.params.cardId },
      data: { x: parsed.data.x, y: parsed.data.y },
    });
    emitCardMoved(card.collageId, card.id, card.x, card.y);
    res.json(card);
  } catch {
    res.status(500).json({ error: 'Failed to update position' });
  }
});

const textSchema = z.object({
  content: z.string().optional(),
  notes: z.string().optional(),
});

cardRouter.patch('/:cardId', async (req, res) => {
  const parsed = textSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const data: { content?: string | null; notes?: string | null } = {};
  if (parsed.data.content !== undefined) data.content = parsed.data.content || null;
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes || null;

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  try {
    const card = await prisma.card.update({
      where: { id: req.params.cardId },
      data,
    });
    emitCardUpdated(card.collageId, card.id, card as unknown as Partial<Card>);
    res.json(card);
  } catch {
    res.status(500).json({ error: 'Failed to update card' });
  }
});

cardRouter.delete('/:cardId', async (req, res) => {
  try {
    const card = await prisma.card.delete({ where: { id: req.params.cardId } });
    emitCardDeleted(card.collageId, card.id);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete card' });
  }
});
