'use client';

import { useEffect, useState } from 'react';
import type { Card, Collage } from '@punk-records/shared';
import { getSocket } from '../lib/socket';
import Canvas from './Canvas';
import AddCardSheet from './AddCardSheet';
import CollageNav from './CollageNav';
import BottomTabBar from './BottomTabBar';
import PrivateGate from './PrivateGate';
import { usePrivateUnlock } from '../hooks/usePrivateUnlock';

interface Props {
  collage: Collage;
  initialCards: Card[];
  allCollages: Collage[];
}

export default function CanvasPageClient({
  collage,
  initialCards,
  allCollages,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [collages, setCollages] = useState<Collage[]>(allCollages);
  const { isUnlocked, keepOpen, keepMinutesLeft, unlock, setKeepOpen, lock } =
    usePrivateUnlock();

  // Socket: collage list updates
  useEffect(() => {
    const socket = getSocket();

    socket.on('collage:created', ({ collage: newCollage }) => {
      setCollages((prev) =>
        prev.find((c) => c.id === newCollage.id) ? prev : [...prev, newCollage]
      );
    });

    socket.on('collage:deleted', ({ collageId }) => {
      setCollages((prev) => prev.filter((c) => c.id !== collageId));
    });

    socket.on('collage:renamed', ({ collageId, name }) => {
      setCollages((prev) =>
        prev.map((c) => (c.id === collageId ? { ...c, name } : c))
      );
    });

    return () => {
      socket.off('collage:created');
      socket.off('collage:deleted');
      socket.off('collage:renamed');
    };
  }, []);

  // Visibility lock: lock when tab or window loses focus (unless keep-open is active)
  useEffect(() => {
    if (!collage.isPrivate || !isUnlocked || keepOpen) return;

    const handleVisibilityChange = () => {
      if (document.hidden) lock();
    };
    const handleBlur = () => lock();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [collage.isPrivate, isUnlocked, keepOpen, lock]);

  const showGate = collage.isPrivate && !isUnlocked;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Gate overlay for private canvases */}
      {showGate && <PrivateGate onUnlock={unlock} />}

      {/* Top bar */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-zinc-800 shrink-0">
        <span className="font-bold text-sm tracking-tight">Punk Records</span>
        <div className="flex items-center gap-2">
          {/* Keep-open toggle — only shown on unlocked private canvas */}
          {collage.isPrivate && isUnlocked && (
            <button
              onClick={() => setKeepOpen(!keepOpen)}
              title={keepOpen ? `Keep-open active (${keepMinutesLeft}m left) — click to disable` : 'Keep open for 1 hour'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px] ${
                keepOpen
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-700/40'
                  : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {keepOpen ? (
                  // Unlocked lock
                  <>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                  </>
                ) : (
                  // Locked lock
                  <>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </>
                )}
              </svg>
              {keepOpen ? `${keepMinutesLeft}m` : '1h'}
            </button>
          )}

          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors min-h-[36px]"
            aria-label="Add card"
          >
            <span className="text-base leading-none">+</span>
            <span className="hidden sm:inline">Add Card</span>
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex">
          <CollageNav collages={collages} activeId={collage.id} />
        </aside>

        {/* Canvas */}
        <main className="flex-1 overflow-hidden">
          <Canvas collage={collage} initialCards={initialCards} />
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden">
        <BottomTabBar collages={collages} activeId={collage.id} />
      </div>

      {/* Add card sheet */}
      <AddCardSheet
        collage={collage}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
