import { Router } from 'express';
import { prisma } from '@punk-records/shared';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const collages = await prisma.collage.findMany({
      orderBy: { createdAt: 'asc' },
    });
    res.json(collages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch collages' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const collage = await prisma.collage.findUnique({
      where: { id: req.params.id },
    });
    if (!collage) return res.status(404).json({ error: 'Not found' });
    res.json(collage);
  } catch {
    res.status(500).json({ error: 'Failed to fetch collage' });
  }
});

export default router;
