'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  onUnlock: () => void;
}

export default function PrivateGate({ onUnlock }: Props) {
  const [flash, setFlash] = useState(false);

  const lastSRef = useRef(0);
  const lastDRef = useRef(0);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function triggerSuccess() {
    setFlash(true);
    setTimeout(() => onUnlock(), 300);
  }

  // Desktop: S → D (within 800ms) → U (within 500ms)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const now = Date.now();

      if (key === 's') {
        lastSRef.current = now;
        lastDRef.current = 0;
      } else if (key === 'd') {
        if (now - lastSRef.current < 800) {
          lastDRef.current = now;
        } else {
          lastSRef.current = 0;
        }
      } else if (key === 'u') {
        if (lastDRef.current > 0 && now - lastDRef.current < 500) {
          lastSRef.current = 0;
          lastDRef.current = 0;
          triggerSuccess();
        }
      } else if (!['shift', 'control', 'alt', 'meta'].includes(key)) {
        lastSRef.current = 0;
        lastDRef.current = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUnlock]);

  // Mobile: tap 8 times within 3 seconds
  function handleTap() {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);

    if (tapCountRef.current >= 8) {
      tapCountRef.current = 0;
      triggerSuccess();
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 3000);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 transition-colors duration-300 ${flash ? 'bg-violet-900' : ''}`}
      onClick={handleTap}
    >
      <div className="text-zinc-700">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
    </div>
  );
}
