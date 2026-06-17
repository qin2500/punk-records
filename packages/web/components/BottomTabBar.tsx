'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Collage } from '@punk-records/shared';

interface Props {
  collages: Collage[];
  activeId: string;
}

const MAX_TABS = 3;

function CollageIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="6" height="6" rx="1.5" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1.5V4.5A3.5 3.5 0 0 0 8 1zm0 1.5A2 2 0 0 1 10 4.5V6H6V4.5A2 2 0 0 1 8 3.5zM8 9a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
    </svg>
  );
}

export default function BottomTabBar({ collages, activeId }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const publicCollages = collages.filter((c) => !c.isPrivate);
  const privateCollages = collages.filter((c) => c.isPrivate);

  // Show public collages first in tabs, then private
  const allOrdered = [...publicCollages, ...privateCollages];
  const visibleCollages = allOrdered.slice(0, MAX_TABS);
  const overflow = allOrdered.slice(MAX_TABS);

  return (
    <>
      <nav className="h-16 border-t border-zinc-800 bg-zinc-950 flex items-center px-2 safe-bottom">
        {visibleCollages.map((c) => (
          <Link
            key={c.id}
            href={`/canvas/${c.id}`}
            className={`flex-1 flex flex-col items-center justify-center min-h-[44px] text-xs transition-colors rounded-lg ${
              c.id === activeId
                ? 'text-violet-400'
                : 'text-zinc-500 hover:text-zinc-200'
            }`}
          >
            <span className="w-4 h-4 mb-0.5">
              {c.isPrivate ? <LockIcon /> : <CollageIcon />}
            </span>
            <span className="truncate max-w-[60px]">{c.name}</span>
          </Link>
        ))}

        {overflow.length > 0 && (
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex-1 flex flex-col items-center justify-center min-h-[44px] text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <span className="text-lg leading-none mb-0.5">···</span>
            <span>More</span>
          </button>
        )}
      </nav>

      {/* Full-screen drawer for overflow collages */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 border-t border-zinc-800 rounded-t-2xl max-h-[70vh] overflow-y-auto slide-up">
            <div className="p-4 flex items-center justify-between border-b border-zinc-800">
              <h3 className="font-semibold text-sm">All Collages</h3>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-800 text-zinc-400"
              >
                ×
              </button>
            </div>

            {publicCollages.length > 0 && (
              <ul className="p-2 space-y-0.5">
                {publicCollages.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/canvas/${c.id}`}
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center px-4 py-3 rounded-xl text-sm transition-colors min-h-[44px] ${
                        c.id === activeId
                          ? 'bg-violet-600/20 text-violet-300'
                          : 'text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {privateCollages.length > 0 && (
              <>
                <p className="px-4 pt-3 pb-1 text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                  Private
                </p>
                <ul className="p-2 space-y-0.5">
                  {privateCollages.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/canvas/${c.id}`}
                        onClick={() => setDrawerOpen(false)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-colors min-h-[44px] ${
                          c.id === activeId
                            ? 'bg-violet-600/20 text-violet-300'
                            : 'text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        <span className="w-3.5 h-3.5 opacity-50 shrink-0"><LockIcon /></span>
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="h-6" />
          </div>
        </>
      )}
    </>
  );
}
