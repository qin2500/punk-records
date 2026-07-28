'use client';

import { useEffect, useRef, useState } from 'react';
import type { Card } from '@punk-records/shared';
import SkeletonCard from './SkeletonCard';
import RefreshButton from './RefreshButton';
import { useRescrape } from '../../lib/useRescrape';

interface Props {
  card: Card;
  onDelete: (id: string) => void;
  onUpdate: (id: string, changes: { notes?: string }) => void;
}

function RedditLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current shrink-0" aria-hidden="true">
      <path d="M12 2a2 2 0 0 1 2 2c0 .5-.2.95-.5 1.3l1.9 3.9a7 7 0 0 1 2.5.6c.3-.4.9-.7 1.5-.7a2 2 0 1 1-1.2 3.6c.1.4.2.8.2 1.3 0 3.3-3.8 6-8.4 6s-8.4-2.7-8.4-6c0-.5.1-.9.2-1.3A2 2 0 1 1 3 10.9c.6 0 1.2.3 1.5.7a7 7 0 0 1 2.5-.6l1.9-3.9c-.3-.35-.5-.8-.5-1.3a2 2 0 0 1 2-2 2 2 0 0 1 1.6.8c.6-.4 1.4-.7 2.4-.8A2 2 0 0 1 12 2zM8.7 13.5a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zm6.6 0a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zm-6.9 4.2a.5.5 0 0 0-.4.85c1 .9 2.6 1.4 4 1.4s3-.5 4-1.4a.5.5 0 1 0-.7-.7c-.8.75-2.1 1.15-3.3 1.15s-2.5-.4-3.3-1.15a.5.5 0 0 0-.3-.15z" />
    </svg>
  );
}

export default function RedditCard({ card, onDelete, onUpdate }: Props) {
  const ageSeconds = (Date.now() - new Date(card.createdAt).getTime()) / 1000;
  const isLoading = !card.ogTitle && !card.ogImage && !card.ogDescription && ageSeconds < 15;

  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(card.notes ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { state: refreshState, refresh } = useRescrape(card.id);

  useEffect(() => {
    if (!editingNote) setNoteDraft(card.notes ?? '');
  }, [card.notes, editingNote]);

  useEffect(() => {
    if (editingNote) {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.selectionStart = el.selectionEnd = el.value.length;
      }
    }
  }, [editingNote]);

  const saveNote = () => {
    setEditingNote(false);
    const trimmed = noteDraft.trim();
    if (trimmed !== (card.notes ?? '').trim()) {
      onUpdate(card.id, { notes: trimmed });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      setNoteDraft(card.notes ?? '');
      setEditingNote(false);
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      saveNote();
    }
  };

  if (isLoading) return <SkeletonCard onDelete={() => onDelete(card.id)} />;

  const hasNote = Boolean(card.notes);

  return (
    <div className="group relative w-[280px] rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-600 transition-colors overflow-hidden">
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-orange-500">
          <RedditLogo />
          <span className="font-medium truncate">{card.ogSiteName ?? 'reddit'}</span>
        </div>

        {card.ogTitle && (
          <p className="text-sm font-medium leading-snug text-zinc-100 line-clamp-3">
            {card.ogTitle}
          </p>
        )}

        {card.ogDescription ? (
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap break-words line-clamp-6">
            {card.ogDescription}
          </p>
        ) : !card.ogImage ? (
          <p className="text-sm text-zinc-500 italic">Link post</p>
        ) : null}
      </div>

      {card.ogImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.ogImage}
          alt=""
          className="w-full object-cover max-h-40"
          loading="lazy"
        />
      )}

      {/* Notes section */}
      <div className="border-t border-zinc-800">
        {editingNote ? (
          <div className="p-2">
            <textarea
              ref={textareaRef}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onBlur={saveNote}
              onKeyDown={handleKeyDown}
              onMouseDown={(e) => e.stopPropagation()}
              className="nodrag nopan w-full bg-transparent text-xs text-zinc-200 leading-relaxed resize-none focus:outline-none placeholder-zinc-600"
              placeholder="Add a note..."
              rows={3}
            />
            <p className="text-[10px] text-zinc-600 text-right mt-0.5">⌘↵ to save · Esc to cancel</p>
          </div>
        ) : (
          <button
            onClick={() => setEditingNote(true)}
            onMouseDown={(e) => e.stopPropagation()}
            className="nodrag nopan w-full text-left px-3 py-2 text-xs leading-relaxed transition-colors hover:bg-zinc-800/50"
          >
            {hasNote ? (
              <span className="text-zinc-300 whitespace-pre-wrap break-words">{card.notes}</span>
            ) : (
              <span className="text-zinc-600 italic">Add a note...</span>
            )}
          </button>
        )}
      </div>

      <RefreshButton state={refreshState} onClick={refresh} />

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
