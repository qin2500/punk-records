'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  onUnlock: () => void;
}

// Desktop: QCF+U = press S, then D (within 800ms), then U (within 500ms)
// Mobile:  tap 8 times within 3 seconds

export default function PrivateGate({ onUnlock }: Props) {
  // 0 = idle, 1 = S pressed (↓), 2 = D pressed (→)
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [tapCount, setTapCount] = useState(0);
  const [flash, setFlash] = useState(false);

  const lastSRef = useRef(0);
  const lastDRef = useRef(0);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function triggerSuccess() {
    setFlash(true);
    setTimeout(() => {
      onUnlock();
    }, 300);
  }

  // Desktop: fireball keydown listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const now = Date.now();

      if (key === 's') {
        lastSRef.current = now;
        lastDRef.current = 0;
        setStep(1);
      } else if (key === 'd') {
        if (now - lastSRef.current < 800) {
          lastDRef.current = now;
          setStep(2);
        } else {
          // D pressed too late, reset
          lastSRef.current = 0;
          setStep(0);
        }
      } else if (key === 'u') {
        if (lastDRef.current > 0 && now - lastDRef.current < 500) {
          lastSRef.current = 0;
          lastDRef.current = 0;
          setStep(0);
          triggerSuccess();
        }
      } else if (key !== 'shift' && key !== 'control' && key !== 'alt' && key !== 'meta') {
        // Any other key resets
        lastSRef.current = 0;
        lastDRef.current = 0;
        setStep(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUnlock]);

  // Mobile: tap counter
  function handleTap() {
    tapCountRef.current += 1;
    setTapCount(tapCountRef.current);

    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);

    if (tapCountRef.current >= 8) {
      tapCountRef.current = 0;
      setTapCount(0);
      triggerSuccess();
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
        setTapCount(0);
      }, 3000);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 transition-colors duration-300 ${flash ? 'bg-violet-900' : ''}`}
      onClick={handleTap}
    >
      {/* Lock icon */}
      <div className="mb-6 text-zinc-500">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>

      <h1 className="text-xl font-bold text-zinc-200 mb-1">Private Canvas</h1>

      {/* Desktop instructions */}
      <div className="hidden sm:flex flex-col items-center gap-5 mt-6">
        <p className="text-xs text-zinc-600 uppercase tracking-widest">Quarter-circle forward + U</p>

        <div className="flex items-center gap-3">
          {/* Down arrow */}
          <div className={`flex flex-col items-center gap-1 transition-colors ${step >= 1 ? 'text-violet-400' : 'text-zinc-700'}`}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 20l-8-8h5V4h6v8h5z" />
            </svg>
            <span className="text-xs font-mono">S</span>
          </div>

          <div className="text-zinc-700 text-lg">→</div>

          {/* Right arrow */}
          <div className={`flex flex-col items-center gap-1 transition-colors ${step >= 2 ? 'text-violet-400' : 'text-zinc-700'}`}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 12l-8 8V9H4V6.5h8V4z" transform="rotate(270 12 12)" />
              <path d="M4 12l8-8v5h8v3H12v5z" />
            </svg>
            <span className="text-xs font-mono">D</span>
          </div>

          <div className="text-zinc-700 text-lg">+</div>

          {/* U punch */}
          <div className={`flex flex-col items-center gap-1 transition-colors ${flash ? 'text-violet-400' : 'text-zinc-700'}`}>
            <div className="w-7 h-7 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">U</div>
            <span className="text-xs font-mono">U</span>
          </div>
        </div>
      </div>

      {/* Mobile instructions */}
      <div className="flex sm:hidden flex-col items-center gap-4 mt-6">
        <p className="text-xs text-zinc-600 uppercase tracking-widest">Tap 8 times</p>
        <div className="flex gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-colors ${i < tapCount ? 'bg-violet-500' : 'bg-zinc-800'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
