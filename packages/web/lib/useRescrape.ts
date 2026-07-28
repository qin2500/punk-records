'use client';

import { useCallback, useState } from 'react';
import { rescrapeCard } from './api';

export type RefreshState = 'idle' | 'loading' | 'error';

export function useRescrape(cardId: string) {
  const [state, setState] = useState<RefreshState>('idle');

  const refresh = useCallback(() => {
    setState('loading');
    rescrapeCard(cardId)
      .then(() => setState('idle'))
      .catch(() => {
        setState('error');
        setTimeout(() => setState('idle'), 3000);
      });
  }, [cardId]);

  return { state, refresh };
}
