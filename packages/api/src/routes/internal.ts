import { Router } from 'express';
import {
  emitCardCreated,
  emitCardUpdated,
  emitCollageCreated,
  emitCollageDeleted,
  emitCollageRenamed,
} from '../socket/emitter';
import type { Card, Collage } from '@punk-records/shared';

const router = Router();

router.post('/emit', (req, res) => {
  const { event, collageId, data } = req.body as {
    event: string;
    collageId?: string;
    data: Record<string, unknown>;
  };

  switch (event) {
    case 'card:created':
      emitCardCreated(collageId!, data.card as Card);
      break;
    case 'card:updated':
      emitCardUpdated(collageId!, data.cardId as string, data.changes as Partial<Card>);
      break;
    case 'collage:created':
      emitCollageCreated(data.collage as Collage);
      break;
    case 'collage:deleted':
      emitCollageDeleted(data.collageId as string);
      break;
    case 'collage:renamed':
      emitCollageRenamed(data.collageId as string, data.name as string);
      break;
  }

  res.status(204).send();
});

export default router;
