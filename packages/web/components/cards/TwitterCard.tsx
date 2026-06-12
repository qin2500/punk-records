'use client';

import type { Card } from '@punk-records/shared';

interface Props {
  card: Card;
  onDelete: (id: string) => void;
}

function XLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function TwitterCard({ card, onDelete }: Props) {
  const isLoading = !card.ogTitle && !card.ogDescription && !card.ogImage;
  const ageSeconds = (Date.now() - new Date(card.createdAt).getTime()) / 1000;

  if (isLoading && ageSeconds < 15) {
    return (
      <div className="w-[280px] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
        <div className="p-4 space-y-2">
          <div className="shimmer h-3 w-32 rounded" />
          <div className="shimmer h-3 w-full rounded" />
          <div className="shimmer h-3 w-3/4 rounded" />
          <div className="shimmer h-24 w-full rounded-lg mt-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="group relative w-[280px] rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-600 transition-colors overflow-hidden">
      <div className="p-3 space-y-2">
        {/* Author row */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <XLogo />
          <span className="font-medium text-zinc-300 truncate">{card.ogTitle}</span>
        </div>

        {/* Tweet text */}
        {card.ogDescription ? (
          <p className="text-sm text-zinc-100 leading-relaxed whitespace-pre-wrap break-words line-clamp-5">
            {card.ogDescription}
          </p>
        ) : (
          <p className="text-sm text-zinc-500 italic">Media post</p>
        )}
      </div>

      {/* Thumbnail (video first frame or photo) */}
      {card.ogImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.ogImage}
          alt=""
          className="w-full object-cover max-h-40"
          loading="lazy"
        />
      )}

      {/* Footer */}
      <div className="px-3 py-2 text-xs text-zinc-500">x.com</div>

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
