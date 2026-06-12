'use client';

import { useEffect, useState } from 'react';
import type { Card, Collage } from '@punk-records/shared';
import { getSocket } from '../lib/socket';
import Canvas from './Canvas';
import AddCardSheet from './AddCardSheet';
import CollageNav from './CollageNav';
import BottomTabBar from './BottomTabBar';

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

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-zinc-800 shrink-0">
        <span className="font-bold text-sm tracking-tight">Punk Records</span>
        <button
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors min-h-[36px]"
          aria-label="Add card"
        >
          <span className="text-base leading-none">+</span>
          <span className="hidden sm:inline">Add Card</span>
        </button>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex">
          <CollageNav collages={collages} activeId={collage.id} />
        </aside>

        {/* Canvas — owns card state, gets live updates via socket */}
        <main className="flex-1 overflow-hidden">
          <Canvas collage={collage} initialCards={initialCards} />
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden">
        <BottomTabBar collages={collages} activeId={collage.id} />
      </div>

      {/* Add card sheet — fires API call; Canvas picks up the new card via socket */}
      <AddCardSheet
        collage={collage}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
