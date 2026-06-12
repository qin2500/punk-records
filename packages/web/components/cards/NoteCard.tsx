'use client';

import { useEffect, useRef, useState } from 'react';
import type { Card } from '@punk-records/shared';

interface Props {
  card: Card;
  onDelete: (id: string) => void;
  onUpdate: (id: string, changes: { content?: string }) => void;
}

export default function NoteCard({ card, onDelete, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(card.content ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync draft when card content changes externally (socket update)
  useEffect(() => {
    if (!editing) setDraft(card.content ?? '');
  }, [card.content, editing]);

  useEffect(() => {
    if (editing) {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.selectionStart = el.selectionEnd = el.value.length;
      }
    }
  }, [editing]);

  const save = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== (card.content ?? '').trim()) {
      onUpdate(card.id, { content: trimmed });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      setDraft(card.content ?? '');
      setEditing(false);
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      save();
    }
  };

  return (
    <div className="group relative w-[280px] min-h-[120px] rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-600 transition-colors p-4">
      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={handleKeyDown}
          onMouseDown={(e) => e.stopPropagation()}
          className="nodrag nopan w-full min-h-[80px] bg-transparent text-sm text-zinc-200 leading-relaxed resize-none focus:outline-none placeholder-zinc-600"
          placeholder="Write something..."
          rows={4}
        />
      ) : (
        <div
          onClick={() => setEditing(true)}
          className="cursor-text min-h-[80px] flex items-center justify-center"
        >
          {card.content ? (
            <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap break-words text-center w-full">
              {card.content}
            </p>
          ) : (
            <p className="text-sm text-zinc-600 italic">Click to edit...</p>
          )}
        </div>
      )}

      {editing && (
        <p className="text-[10px] text-zinc-600 mt-1 text-right">
          ⌘↵ to save · Esc to cancel
        </p>
      )}

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
