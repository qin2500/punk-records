import type { Card, Collage } from '@punk-records/shared';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export async function fetchCollages(): Promise<Collage[]> {
  const res = await fetch(`${API}/api/collages`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch collages');
  return res.json();
}

export async function fetchCollage(id: string): Promise<Collage> {
  const res = await fetch(`${API}/api/collages/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch collage');
  return res.json();
}

export async function fetchCards(collageId: string): Promise<Card[]> {
  const res = await fetch(`${API}/api/collages/${collageId}/cards`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch cards');
  return res.json();
}

export async function uploadImage(file: File, collageId: string): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  form.append('collageId', collageId);
  const res = await fetch(`${API}/api/upload`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? 'Failed to upload image');
  }
  const data = await res.json();
  return data.url as string;
}

export async function createCard(
  collageId: string,
  payload:
    | { type: 'LINK' | 'NOTE'; content: string }
    | { type: 'IMAGE'; url: string; notes?: string }
): Promise<Card> {
  const res = await fetch(`${API}/api/collages/${collageId}/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create card');
  return res.json();
}

export async function updateCardPosition(
  cardId: string,
  x: number,
  y: number
): Promise<void> {
  await fetch(`${API}/api/cards/${cardId}/position`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ x, y }),
  });
}

export async function updateCardText(
  cardId: string,
  changes: { content?: string; notes?: string }
): Promise<void> {
  await fetch(`${API}/api/cards/${cardId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  });
}

export async function deleteCard(cardId: string): Promise<void> {
  await fetch(`${API}/api/cards/${cardId}`, { method: 'DELETE' });
}
