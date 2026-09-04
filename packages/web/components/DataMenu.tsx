'use client';

import { useRef, useState } from 'react';
import type { ExportPayload } from '@punk-records/shared';
import { exportData } from '../lib/api';
import ImportConfirmModal from './ImportConfirmModal';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function DataMenu({ open, onClose }: Props) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [pendingImport, setPendingImport] = useState<ExportPayload | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setError('');
    setExporting(true);
    try {
      const blob = await exportData();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `punk-records-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    setError('');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed?.schemaVersion !== 1 || !Array.isArray(parsed?.collages)) {
        setError('This file doesn\'t look like a Punk Records export.');
        return;
      }
      setPendingImport(parsed as ExportPayload);
    } catch {
      setError('Could not read that file as JSON.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!open && !pendingImport) return null;

  return (
    <>
      {open && !pendingImport && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

          <div className="fixed z-50
            bottom-0 left-0 right-0 rounded-t-2xl
            md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2
            md:w-[380px] md:rounded-2xl
            bg-zinc-900 border border-zinc-800 p-6 slide-up md:animate-none"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Data</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full text-left bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-xl px-4 py-3 text-sm font-medium transition-colors min-h-[44px]"
              >
                {exporting ? 'Preparing export…' : 'Export data'}
                <p className="text-xs text-zinc-500 font-normal mt-0.5">
                  Download every collage and card as a JSON file
                </p>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-left bg-zinc-800 hover:bg-zinc-700 rounded-xl px-4 py-3 text-sm font-medium transition-colors min-h-[44px]"
              >
                Import data
                <p className="text-xs text-zinc-500 font-normal mt-0.5">
                  Replace everything with a previously exported file
                </p>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
              />

              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          </div>
        </>
      )}

      {pendingImport && (
        <ImportConfirmModal
          payload={pendingImport}
          onClose={() => setPendingImport(null)}
        />
      )}
    </>
  );
}
