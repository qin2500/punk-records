'use client';

import { useState, useCallback } from 'react';

const KEEP_KEY = 'punk_private_keep_expiry';

export function usePrivateUnlock() {
  // In-memory unlock (cleared on tab switch unless keepOpen is active)
  const [unlocked, setUnlocked] = useState(false);

  // Persisted 1-hour keep-open expiry
  const [keepExpiry, setKeepExpiry] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    return Number(sessionStorage.getItem(KEEP_KEY) ?? '0');
  });

  const keepOpen = keepExpiry > Date.now();
  const isUnlocked = unlocked || keepOpen;

  const unlock = useCallback(() => setUnlocked(true), []);

  const setKeepOpen = useCallback((keep: boolean) => {
    if (keep) {
      const expiry = Date.now() + 3_600_000;
      sessionStorage.setItem(KEEP_KEY, String(expiry));
      setKeepExpiry(expiry);
    } else {
      sessionStorage.removeItem(KEEP_KEY);
      setKeepExpiry(0);
    }
  }, []);

  // lock() clears in-memory unlock but preserves keepOpen
  const lock = useCallback(() => setUnlocked(false), []);

  // keepMinutesLeft: how many minutes remain in keep-open mode
  const keepMinutesLeft = keepOpen ? Math.ceil((keepExpiry - Date.now()) / 60_000) : 0;

  return { isUnlocked, keepOpen, keepMinutesLeft, unlock, setKeepOpen, lock };
}
