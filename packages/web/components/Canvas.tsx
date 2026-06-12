'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  BackgroundVariant,
  type Node,
  type NodeDragHandler,
  type NodeMouseHandler,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { Card, Collage } from '@punk-records/shared';
import { getSocket } from '../lib/socket';
import { updateCardPosition, deleteCard } from '../lib/api';
import CardNode, { type CardNodeData } from './CardNode';

const nodeTypes = { card: CardNode };

const UNDO_WINDOW_MS = 4000;

function cardToNode(card: Card, onDelete: (id: string) => void): Node<CardNodeData> {
  return {
    id: card.id,
    type: 'card',
    position: { x: card.x, y: card.y },
    data: { card, onDelete },
    draggable: true,
  };
}

interface PendingDelete {
  card: Card;
}

interface Props {
  collage: Collage;
  initialCards: Card[];
}

// Inner component — must be inside ReactFlowProvider to use useReactFlow()
function CanvasInner({ collage, initialCards }: Props) {
  const { screenToFlowPosition } = useReactFlow();
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [pendingDeletes, setPendingDeletes] = useState<Map<string, PendingDelete>>(new Map());
  const deleteTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const dragTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardsRef = useRef(cards);
  useEffect(() => { cardsRef.current = cards; }, [cards]);

  const commitDelete = useCallback((id: string) => {
    deleteCard(id);
    setPendingDeletes((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    deleteTimers.current.delete(id);
  }, []);

  const handleDelete = useCallback((id: string) => {
    const card = cardsRef.current.find((c) => c.id === id);
    if (!card) return;
    setCards((prev) => prev.filter((c) => c.id !== id));
    setPendingDeletes((prev) => new Map(prev).set(id, { card }));
    const timer = setTimeout(() => commitDelete(id), UNDO_WINDOW_MS);
    deleteTimers.current.set(id, timer);
  }, [commitDelete]);

  const handleUndo = useCallback((id: string) => {
    const timer = deleteTimers.current.get(id);
    if (timer) clearTimeout(timer);
    deleteTimers.current.delete(id);
    setPendingDeletes((prev) => {
      const entry = prev.get(id);
      if (entry) setCards((c) => [...c, entry.card]);
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(
    initialCards.map((c) => cardToNode(c, handleDelete))
  );

  useEffect(() => {
    setRfNodes(cards.map((c) => cardToNode(c, handleDelete)));
  }, [cards, handleDelete, setRfNodes]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit('join:collage', collage.id);

    socket.on('card:created', ({ card }) => {
      // Place WEBAPP cards at the center of the current viewport
      if (card.source === 'WEBAPP') {
        const container = document.querySelector('.react-flow') as HTMLElement | null;
        const w = container?.clientWidth ?? window.innerWidth;
        const h = container?.clientHeight ?? window.innerHeight;
        const { x, y } = screenToFlowPosition({ x: w / 2, y: h / 2 });
        const centered = { ...card, x, y };
        setCards((prev) =>
          prev.find((c) => c.id === card.id) ? prev : [...prev, centered]
        );
        updateCardPosition(card.id, x, y);
      } else {
        setCards((prev) =>
          prev.find((c) => c.id === card.id) ? prev : [...prev, card]
        );
      }
    });

    socket.on('card:updated', ({ cardId, changes }) => {
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, ...changes } : c))
      );
    });

    socket.on('card:deleted', ({ cardId }) => {
      setCards((prev) => prev.filter((c) => c.id !== cardId));
    });

    socket.on('card:moved', ({ cardId, x, y }) => {
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, x, y } : c))
      );
    });

    return () => {
      socket.emit('leave:collage', collage.id);
      socket.off('card:created');
      socket.off('card:updated');
      socket.off('card:deleted');
      socket.off('card:moved');
    };
  }, [collage.id, screenToFlowPosition]);

  const onNodeDoubleClick: NodeMouseHandler = useCallback((_event, node) => {
    const url = (node.data as CardNodeData).card.url;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const onNodeDragStop: NodeDragHandler = useCallback((_event, node) => {
    const { x, y } = node.position;
    if (dragTimer.current) clearTimeout(dragTimer.current);
    dragTimer.current = setTimeout(() => {
      updateCardPosition(node.id, x, y);
    }, 300);
  }, []);

  const toasts = [...pendingDeletes.entries()];

  if (cards.length === 0 && toasts.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-zinc-400 text-sm">
            Drop a link in{' '}
            <code className="bg-zinc-800 px-1 rounded">
              #canvas-{collage.name.replace(/\s+/g, '-')}
            </code>{' '}
            on Discord,
          </p>
          <p className="text-zinc-400 text-sm">or tap + to add your first card.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={rfNodes}
        edges={[]}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        nodesDraggable={true}
        panOnDrag={true}
        zoomOnPinch={true}
        minZoom={0.1}
        maxZoom={2}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#2a2a2a" />
        <Controls />
        <MiniMap
          nodeColor="#3a3a3a"
          maskColor="rgba(0,0,0,0.6)"
          style={{ background: '#1a1a1a' }}
        />
      </ReactFlow>

      {toasts.length > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map(([id, { card }]) => (
            <div
              key={id}
              className="pointer-events-auto flex items-center gap-3 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 shadow-xl text-sm"
            >
              <span className="text-zinc-300">
                {card.type === 'LINK' ? 'Link' : 'Note'} deleted
              </span>
              <button
                onClick={() => handleUndo(id)}
                className="text-violet-400 hover:text-violet-300 font-semibold transition-colors"
              >
                Undo
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Outer component wraps with ReactFlowProvider so CanvasInner can call useReactFlow()
export default function Canvas(props: Props) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
