export type CardType = 'LINK' | 'NOTE' | 'IMAGE';
export type CardSource = 'DISCORD' | 'WEBAPP';

export interface Collage {
  id: string;
  name: string;
  discordChannelId: string;
  createdAt: string;
}

export interface Card {
  id: string;
  collageId: string;
  type: CardType;
  content: string | null;
  notes: string | null;
  url: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogSiteName: string | null;
  ogFavicon: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  source: CardSource;
  discordMessageId: string | null;
  createdAt: string;
}

// Socket.io event payloads
export interface CardCreatedEvent {
  card: Card;
}

export interface CardUpdatedEvent {
  cardId: string;
  changes: Partial<Card>;
}

export interface CardDeletedEvent {
  cardId: string;
}

export interface CardMovedEvent {
  cardId: string;
  x: number;
  y: number;
}

export interface CollageCreatedEvent {
  collage: Collage;
}

export interface CollageDeletedEvent {
  collageId: string;
}

export interface CollageRenamedEvent {
  collageId: string;
  name: string;
}

export type ServerToClientEvents = {
  'card:created': (data: CardCreatedEvent) => void;
  'card:updated': (data: CardUpdatedEvent) => void;
  'card:deleted': (data: CardDeletedEvent) => void;
  'card:moved': (data: CardMovedEvent) => void;
  'collage:created': (data: CollageCreatedEvent) => void;
  'collage:deleted': (data: CollageDeletedEvent) => void;
  'collage:renamed': (data: CollageRenamedEvent) => void;
};

export type ClientToServerEvents = {
  'join:collage': (collageId: string) => void;
  'leave:collage': (collageId: string) => void;
};
