'use client';

import { memo } from 'react';
import type { NodeProps } from 'reactflow';
import type { Card } from '@punk-records/shared';
import ImageCard from './cards/ImageCard';
import ImdbCard from './cards/ImdbCard';
import LinkCard from './cards/LinkCard';
import NoteCard from './cards/NoteCard';
import TwitterCard from './cards/TwitterCard';

export type CardNodeData = {
  card: Card;
  onDelete: (id: string) => void;
  onUpdate: (id: string, changes: { content?: string; notes?: string }) => void;
};

const TWITTER_RE = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\//i;
const IMDB_RE = /^https?:\/\/(www\.)?imdb\.com\//i;

const CardNode = memo(function CardNode({ data }: NodeProps<CardNodeData>) {
  const { card, onDelete, onUpdate } = data;

  if (card.type === 'NOTE') return <NoteCard card={card} onDelete={onDelete} onUpdate={onUpdate} />;
  if (card.type === 'IMAGE') return <ImageCard card={card} onDelete={onDelete} onUpdate={onUpdate} />;
  if (card.url && TWITTER_RE.test(card.url)) return <TwitterCard card={card} onDelete={onDelete} onUpdate={onUpdate} />;
  if (card.url && IMDB_RE.test(card.url)) return <ImdbCard card={card} onDelete={onDelete} onUpdate={onUpdate} />;
  return <LinkCard card={card} onDelete={onDelete} onUpdate={onUpdate} />;
});

export default CardNode;
