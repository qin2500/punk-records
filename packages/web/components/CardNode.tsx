'use client';

import { memo } from 'react';
import type { NodeProps } from 'reactflow';
import type { Card } from '@punk-records/shared';
import LinkCard from './cards/LinkCard';
import NoteCard from './cards/NoteCard';
import TwitterCard from './cards/TwitterCard';

export type CardNodeData = {
  card: Card;
  onDelete: (id: string) => void;
};

const TWITTER_RE = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\//i;

const CardNode = memo(function CardNode({ data }: NodeProps<CardNodeData>) {
  const { card, onDelete } = data;

  if (card.type === 'NOTE') return <NoteCard card={card} onDelete={onDelete} />;
  if (card.url && TWITTER_RE.test(card.url)) return <TwitterCard card={card} onDelete={onDelete} />;
  return <LinkCard card={card} onDelete={onDelete} />;
});

export default CardNode;
