import type { Server } from 'socket.io';
import type {
  Card,
  Collage,
  ServerToClientEvents,
  ClientToServerEvents,
} from '@punk-records/shared';

type IoServer = Server<ClientToServerEvents, ServerToClientEvents>;

let io: IoServer | null = null;

export function setIo(server: IoServer): void {
  io = server;
}

export function getIo(): IoServer {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

export function emitCardCreated(collageId: string, card: Card): void {
  getIo().to(collageId).emit('card:created', { card });
}

export function emitCardUpdated(
  collageId: string,
  cardId: string,
  changes: Partial<Card>
): void {
  getIo().to(collageId).emit('card:updated', { cardId, changes });
}

export function emitCardDeleted(collageId: string, cardId: string): void {
  getIo().to(collageId).emit('card:deleted', { cardId });
}

export function emitCardMoved(
  collageId: string,
  cardId: string,
  x: number,
  y: number
): void {
  getIo().to(collageId).emit('card:moved', { cardId, x, y });
}

export function emitCollageCreated(collage: Collage): void {
  getIo().emit('collage:created', { collage });
}

export function emitCollageDeleted(collageId: string): void {
  getIo().emit('collage:deleted', { collageId });
}

export function emitCollageRenamed(collageId: string, name: string): void {
  getIo().emit('collage:renamed', { collageId, name });
}
