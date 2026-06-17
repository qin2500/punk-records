'use client';

import Link from 'next/link';
import type { Collage } from '@punk-records/shared';

interface Props {
  collages: Collage[];
  activeId: string;
}

function NavItem({ c, activeId }: { c: Collage; activeId: string }) {
  return (
    <li key={c.id}>
      <Link
        href={`/canvas/${c.id}`}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
          c.id === activeId
            ? 'bg-violet-600/20 text-violet-300'
            : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
        }`}
      >
        {c.isPrivate && (
          <svg className="shrink-0 opacity-50" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1C8.676 1 6 3.676 6 7v1H4a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-2V7c0-3.324-2.676-6-6-6zm0 2c2.276 0 4 1.724 4 4v1H8V7c0-2.276 1.724-4 4-4zm0 9a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" />
          </svg>
        )}
        <span className="truncate">{c.name}</span>
      </Link>
    </li>
  );
}

export default function CollageNav({ collages, activeId }: Props) {
  const publicCollages = collages.filter((c) => !c.isPrivate);
  const privateCollages = collages.filter((c) => c.isPrivate);

  return (
    <nav className="w-48 shrink-0 border-r border-zinc-800 flex flex-col py-4 overflow-y-auto">
      {publicCollages.length > 0 && (
        <>
          <p className="px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Collages
          </p>
          <ul className="space-y-0.5 px-2 mb-4">
            {publicCollages.map((c) => (
              <NavItem key={c.id} c={c} activeId={activeId} />
            ))}
          </ul>
        </>
      )}

      {privateCollages.length > 0 && (
        <>
          <p className="px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Private
          </p>
          <ul className="space-y-0.5 px-2">
            {privateCollages.map((c) => (
              <NavItem key={c.id} c={c} activeId={activeId} />
            ))}
          </ul>
        </>
      )}
    </nav>
  );
}
