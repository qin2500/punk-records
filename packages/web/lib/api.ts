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

export async function createCard(
  collageId: string,
  type: 'LINK' | 'NOTE',
  content: string
): Promise<Card> {
  const res = await fetch(`${API}/api/collages/${collageId}/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, content }),
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

export async function deleteCard(cardId: string): Promise<void> {
  await fetch(`${API}/api/cards/${cardId}`, { method: 'DELETE' });
}
