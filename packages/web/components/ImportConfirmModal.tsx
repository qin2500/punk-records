'use client';

import { useState } from 'react';
import type { ExportPayload, ImportSummary } from '@punk-records/shared';
import { importData } from '../lib/api';

interface Props {
  payload: ExportPayload;
  onClose: () => void;
}

const CONFIRM_WORD = 'import';

export default function ImportConfirmModal({ payload, onClose }: Props) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportSummary | null>(null);

  const canConfirm = confirmText.trim().toLowerCase() === CONFIRM_WORD;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setLoading(true);
    setError('');
    try {
      const summary = await importData(payload);
      setResult(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-[60]" />

      <div className="fixed z-[70]
        bottom-0 left-0 right-0 rounded-t-2xl
        md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2
        md:w-[440px] md:rounded-2xl
        bg-zinc-900 border border-red-900/50 p-6 slide-up md:animate-none"
      >
        {result ? (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-zinc-100">Import complete</h2>
            <ul className="text-sm text-zinc-300 space-y-1">
              <li>{result.collagesImported} collage{result.collagesImported === 1 ? '' : 's'} imported</li>
              <li>{result.cardsImported} card{result.cardsImported === 1 ? '' : 's'} imported</li>
              <li>{result.channelsCreated} Discord channel{result.channelsCreated === 1 ? '' : 's'} created</li>
            </ul>
            {result.warnings.length > 0 && (
              <div className="bg-zinc-800 rounded-xl p-3 text-xs text-zinc-400 space-y-1 max-h-40 overflow-y-auto">
                {result.warnings.map((w, i) => (
                  <p key={i}>{w}</p>
                ))}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white rounded-xl py-3 text-sm font-semibold transition-colors min-h-[44px]"
            >
              Continue
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-red-400">This will replace everything</h2>
            <p className="text-sm text-zinc-300">
              Importing this file <strong>permanently deletes every collage and card currently in Punk
              Records</strong> and replaces them with the file's contents. This cannot be undone.
            </p>
            <p className="text-sm text-zinc-300">
              Image cards are not part of the export format, so <strong>any image cards on any canvas
              will be deleted and cannot be restored</strong> by this import, even if you exported very
              recently.
            </p>
            <p className="text-xs text-zinc-500">
              Type <span className="text-zinc-300 font-mono">{CONFIRM_WORD}</span> to confirm.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_WORD}
              autoFocus
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-red-500 transition-colors"
            />

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl py-3 text-sm font-medium transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!canConfirm || loading}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-semibold transition-colors min-h-[44px]"
              >
                {loading ? 'Importing…' : 'Delete & Import'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
