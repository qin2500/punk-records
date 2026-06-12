'use client';

export default function SkeletonCard() {
  return (
    <div className="w-[280px] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900">
      <div className="shimmer h-36 w-full" />
      <div className="p-3 space-y-2">
        <div className="shimmer h-3 w-24 rounded" />
        <div className="shimmer h-4 w-full rounded" />
        <div className="shimmer h-3 w-3/4 rounded" />
      </div>
    </div>
  );
}
