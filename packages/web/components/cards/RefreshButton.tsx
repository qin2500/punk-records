'use client';

import type { RefreshState } from '../../lib/useRescrape';

interface Props {
  state: RefreshState;
  onClick: () => void;
}

export default function RefreshButton({ state, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={state === 'loading'}
      className={`absolute top-2 right-9 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs leading-none ${
        state === 'error' ? 'text-red-400 hover:text-red-300 opacity-100' : 'text-zinc-400 hover:text-white'
      }`}
      aria-label="Refresh preview"
      title={state === 'error' ? 'Refresh failed — click to try again' : 'Refresh preview'}
    >
      <svg
        viewBox="0 0 24 24"
        className={`w-3.5 h-3.5 fill-none stroke-current ${state === 'loading' ? 'animate-spin' : ''}`}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 12a9 9 0 0 1 15.3-6.36M21 12a9 9 0 0 1-15.3 6.36" />
        <path d="M18 3v5h-5M6 21v-5h5" />
      </svg>
    </button>
  );
}
