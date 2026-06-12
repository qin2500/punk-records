'use client';

interface Props {
  onDelete: () => void;
}

export default function SkeletonCard({ onDelete }: Props) {
  return (
    <div className="group relative w-[280px] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
      <div className="shimmer h-36 w-full" />
      <div className="p-3 space-y-2">
        <div className="shimmer h-3 w-24 rounded" />
        <div className="shimmer h-4 w-full rounded" />
        <div className="shimmer h-3 w-3/4 rounded" />
      </div>
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-zinc-400 hover:text-white hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs leading-none"
        aria-label="Delete card"
      >
        ×
      </button>
    </div>
  );
}
