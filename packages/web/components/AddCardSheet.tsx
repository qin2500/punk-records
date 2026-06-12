'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createCard, uploadImage } from '../lib/api';
import type { Collage } from '@punk-records/shared';

type TabType = 'NOTE' | 'LINK' | 'IMAGE';

interface Props {
  collage: Collage;
  open: boolean;
  onClose: () => void;
}

export default function AddCardSheet({ collage, open, onClose }: Props) {
  const [tab, setTab] = useState<TabType>('NOTE');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [draggingOver, setDraggingOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setContent('');
    setImageUrl('');
    setImageFile(null);
    setImagePreview(null);
    setError('');
    setTab('NOTE');
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    } else {
      resetForm();
    }
  }, [open, resetForm]);

  // Auto-detect link when pasting in NOTE tab
  const handleContentChange = (val: string) => {
    setContent(val);
    if (/^https?:\/\//i.test(val.trim())) setTab('LINK');
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Only image files are supported.');
      return;
    }
    setError('');
    setImageFile(file);
    setImageUrl('');
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggingOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'IMAGE') {
        let url = imageUrl.trim();
        if (imageFile) {
          url = await uploadImage(imageFile);
        }
        if (!url) { setError('Add an image or paste a URL.'); return; }
        await createCard(collage.id, { type: 'IMAGE', url });
      } else {
        if (!content.trim()) return;
        await createCard(collage.id, { type: tab, content: content.trim() });
      }
      onClose();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const tabs: { key: TabType; label: string }[] = [
    { key: 'NOTE', label: 'Note' },
    { key: 'LINK', label: 'Link' },
    { key: 'IMAGE', label: 'Image' },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

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

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors min-h-[44px] ${
                tab === key
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'IMAGE' ? (
            <div className="space-y-3">
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDraggingOver(true); }}
                onDragLeave={() => setDraggingOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative w-full rounded-xl border-2 border-dashed cursor-pointer transition-colors flex items-center justify-center overflow-hidden
                  ${draggingOver ? 'border-violet-500 bg-violet-500/10' : 'border-zinc-700 hover:border-zinc-500 bg-zinc-800/50'}`}
                style={{ minHeight: imagePreview ? 'auto' : '140px' }}
              >
                {imagePreview ? (
                  <div className="relative w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="" className="w-full max-h-48 object-contain rounded-xl" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 text-zinc-300 hover:text-white flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-6 text-zinc-500 text-sm select-none">
                    <p className="text-2xl mb-2">🖼</p>
                    <p>Drop an image here, or <span className="text-violet-400">browse</span></p>
                    <p className="text-xs text-zinc-600 mt-1">PNG, JPG, GIF, WebP up to 20 MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
                />
              </div>

              {/* URL fallback */}
              {!imageFile && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-zinc-700" />
                  <span className="text-xs text-zinc-600">or paste a URL</span>
                  <div className="flex-1 h-px bg-zinc-700" />
                </div>
              )}
              {!imageFile && (
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
                />
              )}
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder={tab === 'LINK' ? 'Paste a URL…' : "What's on your mind?"}
              rows={4}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:border-violet-500 transition-colors"
            />
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || (tab === 'IMAGE' ? (!imageFile && !imageUrl.trim()) : !content.trim())}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-semibold transition-colors min-h-[44px]"
          >
            {loading ? (tab === 'IMAGE' && imageFile ? 'Uploading…' : 'Adding…') : 'Add Card'}
          </button>
        </form>
      </div>
    </>
  );
}
