'use client';

import Link from 'next/link';
import type { Collage } from '@punk-records/shared';

interface Props {
  collages: Collage[];
  activeId: string;
}

export default function CollageNav({ collages, activeId }: Props) {
  return (
    <nav className="w-48 shrink-0 border-r border-zinc-800 flex flex-col py-4 overflow-y-auto">
      <p className="px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
        Collages
      </p>
      <ul className="space-y-0.5 px-2">
        {collages.map((c) => (
          <li key={c.id}>
            <Link
              href={`/canvas/${c.id}`}
              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                c.id === activeId
                  ? 'bg-violet-600/20 text-violet-300'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
              }`}
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
