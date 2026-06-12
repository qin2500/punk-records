'use client';

import type { Card } from '@punk-records/shared';
import SkeletonCard from './SkeletonCard';

interface Props {
  card: Card;
  onDelete: (id: string) => void;
}

function isAbsoluteUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

export default function LinkCard({ card, onDelete }: Props) {
  // Show skeleton only for cards created in the last 15s with no OG data yet
  const ageSeconds = (Date.now() - new Date(card.createdAt).getTime()) / 1000;
  const isLoading = !card.ogTitle && !card.ogImage && ageSeconds < 15;

  if (isLoading) return <SkeletonCard />;

  const domain = card.url
    ? new URL(card.url).hostname.replace(/^www\./, '')
    : card.ogSiteName ?? '';

  // Only use ogImage if it's an absolute URL — scrapers sometimes return relative paths
  const image = card.ogImage && isAbsoluteUrl(card.ogImage) ? card.ogImage : null;
  const favicon = card.ogFavicon && isAbsoluteUrl(card.ogFavicon) ? card.ogFavicon : null;

  return (
    <div className="group relative w-[280px] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 hover:border-zinc-600 transition-colors">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          className="w-full h-36 object-cover"
          loading="lazy"
        />
      )}
      <div className="p-3 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          {favicon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={favicon} alt="" className="w-3 h-3" />
          )}
          <span className="truncate">{domain}</span>
        </div>
        {card.ogTitle ? (
          <p className="text-sm font-medium leading-snug line-clamp-2 text-zinc-100">
            {card.ogTitle}
          </p>
        ) : (
          <p className="text-sm font-medium leading-snug line-clamp-2 text-zinc-400 italic">
            {domain}
          </p>
        )}
        {card.ogDescription && (
          <p className="text-xs text-zinc-400 line-clamp-2">
            {card.ogDescription}
          </p>
        )}
      </div>

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
