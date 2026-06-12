/**
 * The bot runs as a separate process from the API.
 * It triggers real-time socket events by POSTing to the API's internal emit endpoint.
 */
import type { Card, Collage } from '@punk-records/shared';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

async function post(path: string, body: unknown): Promise<void> {
  try {
    await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    // Non-fatal: socket emit failure shouldn't crash the bot
  }
}

export function emitCardCreated(collageId: string, card: Card): void {
  post('/internal/emit', { event: 'card:created', collageId, data: { card } });
}

export function emitCardUpdated(collageId: string, cardId: string, changes: Partial<Card>): void {
  post('/internal/emit', { event: 'card:updated', collageId, data: { cardId, changes } });
}

export function emitCollageCreated(collage: Collage): void {
  post('/internal/emit', { event: 'collage:created', data: { collage } });
}

export function emitCollageDeleted(collageId: string): void {
  post('/internal/emit', { event: 'collage:deleted', data: { collageId } });
}

export function emitCollageRenamed(collageId: string, name: string): void {
  post('/internal/emit', { event: 'collage:renamed', data: { collageId, name } });
}
