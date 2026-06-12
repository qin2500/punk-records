'use client';

import { useEffect, useRef, useState } from 'react';
import { createCard } from '../lib/api';
import type { Collage } from '@punk-records/shared';

interface Props {
  collage: Collage;
  open: boolean;
  onClose: () => void;
}

export default function AddCardSheet({ collage, open, onClose }: Props) {
  const [content, setContent] = useState('');
  const [type, setType] = useState<'LINK' | 'NOTE'>('NOTE');
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleContentChange = (val: string) => {
    setContent(val);
    if (/^https?:\/\//i.test(val.trim())) {
      setType('LINK');
    }
  };

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    } else {
      setContent('');
      setType('NOTE');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    try {
      await createCard(collage.id, type, content.trim());
      // Canvas picks up the new card via the socket `card:created` event
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Sheet — slides up from bottom on mobile, centered modal on desktop */}
      <div className="fixed z-50
        bottom-0 left-0 right-0 rounded-t-2xl
        md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2
        md:w-[420px] md:rounded-2xl
        bg-zinc-900 border border-zinc-800 p-6 slide-up md:animate-none"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">
            Add to <span className="text-violet-400">{collage.name}</span>
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            ×
          </button>
        </div>

        {/* Type toggle */}
        <div className="flex gap-2 mb-4">
          {(['LINK', 'NOTE'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors min-h-[44px] ${
                type === t
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {t === 'LINK' ? 'Link' : 'Note'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder={type === 'LINK' ? 'Paste a URL…' : "What's on your mind?"}
            rows={4}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:border-violet-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!content.trim() || loading}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-semibold transition-colors min-h-[44px]"
          >
            {loading ? 'Adding…' : 'Add Card'}
          </button>
        </form>
      </div>
    </>
  );
}
