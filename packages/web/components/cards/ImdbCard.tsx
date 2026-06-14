'use client';

import { useEffect, useRef, useState } from 'react';
import type { Card } from '@punk-records/shared';
import SkeletonCard from './SkeletonCard';

interface Props {
  card: Card;
  onDelete: (id: string) => void;
  onUpdate: (id: string, changes: { notes?: string }) => void;
}

export default function ImdbCard({ card, onDelete, onUpdate }: Props) {
  const ageSeconds = (Date.now() - new Date(card.createdAt).getTime()) / 1000;
  const isLoading = !card.ogTitle && !card.ogImage && ageSeconds < 15;

  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(card.notes ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    <div className="group relative w-[200px] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 hover:border-zinc-600 transition-colors">
      {card.ogImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.ogImage}
          alt={card.ogTitle ?? 'Movie poster'}
          className="w-full h-[290px] object-cover object-top"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-[290px] bg-zinc-800 flex items-center justify-center">
          <span className="text-yellow-500 font-black text-3xl tracking-tight">IMDb</span>
        </div>
      )}

      <div className="p-3 space-y-1">
        <span className="text-[10px] font-bold text-yellow-500 tracking-widest uppercase">IMDb</span>
        {card.ogTitle && (
          <p className="text-sm font-semibold leading-snug line-clamp-2 text-zinc-100">
            {card.ogTitle}
          </p>
        )}
        {card.ogDescription && (
          <p className="text-xs text-zinc-400 line-clamp-2">{card.ogDescription}</p>
        )}
      </div>

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
