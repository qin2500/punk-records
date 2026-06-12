'use client';

import type { Card } from '@punk-records/shared';

interface Props {
  card: Card;
  onDelete: (id: string) => void;
}

export default function NoteCard({ card, onDelete }: Props) {
  return (
    <div className="group relative w-[280px] min-h-[120px] rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-600 transition-colors p-4 flex items-center justify-center">
      <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap break-words text-center">
        {card.content}
      </p>
      <button
        onClick={() => onDelete(card.id)}
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-zinc-400 hover:text-white hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs leading-none"
        aria-label="Delete card"
      >
        ×
      </button>
    </div>
  );
}
