import { useRef, useState, type PointerEvent } from 'react';

export interface SwipeHandlers {
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Toucher bref sans glissement ; coordonnées dans la fenêtre. */
  onTap?: (clientX: number, clientY: number) => void;
}

/** Distance (px) au-delà de laquelle un glissement devient un swipe. */
const DISTANCE = 70;
/** Vitesse (px/ms) qui suffit à déclencher un swipe court mais franc. */
const VELOCITY = 0.5;
/** Mouvement (px) en dessous duquel on considère un toucher. */
const TAP_SLOP = 8;

type Axis = 'x' | 'y' | null;

/**
 * Gestes de swipe à la souris, au doigt ou au stylet (Pointer Events).
 * Le premier mouvement franc verrouille l'axe, pour ne pas mélanger défilement et retournement.
 */
export function useSwipe(handlers: SwipeHandlers) {
  const start = useRef<{ x: number; y: number; t: number; id: number } | null>(null);
  const axis = useRef<Axis>(null);
  const [offset, setOffset] = useState({ dx: 0, dy: 0 });
  const [dragging, setDragging] = useState(false);

  const reset = () => {
    start.current = null;
    axis.current = null;
    setDragging(false);
    setOffset({ dx: 0, dy: 0 });
  };

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    // Les boutons gardent leur clic normal.
    if ((e.target as HTMLElement).closest('button, a, input')) return;
    start.current = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
    axis.current = null;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!axis.current && Math.hypot(dx, dy) > TAP_SLOP) {
      axis.current = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x';
      setDragging(true);
    }
    if (axis.current === 'y') setOffset({ dx: 0, dy });
    else if (axis.current === 'x') setOffset({ dx, dy: 0 });
  };

  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    const dt = Math.max(1, performance.now() - s.t);
    if (!axis.current) {
      handlers.onTap?.(e.clientX, e.clientY);
    } else if (axis.current === 'y') {
      const fast = Math.abs(dy) / dt > VELOCITY;
      if (dy < -DISTANCE || (fast && dy < 0)) handlers.onSwipeUp?.();
      else if (dy > DISTANCE || (fast && dy > 0)) handlers.onSwipeDown?.();
    } else {
      const fast = Math.abs(dx) / dt > VELOCITY;
      if (dx < -DISTANCE || (fast && dx < 0)) handlers.onSwipeLeft?.();
      else if (dx > DISTANCE || (fast && dx > 0)) handlers.onSwipeRight?.();
    }
    reset();
  };

  return {
    offset,
    dragging,
    bind: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: reset },
  };
}
