import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { containRect, pixelAt, pixelCoords, toImagePoint } from '../lib/loadImage';
import type { ImageCard, ImagePoint } from '../types';

const LOUPE = 120;
/** Pixels visibles dans la loupe, de chaque côté du pixel visé. */
const RADIUS = 7;
const CELL = LOUPE / (RADIUS * 2 + 1);

interface Probe {
  /** Position dans le cadre, en px. */
  cx: number;
  cy: number;
  at: ImagePoint | null;
  touch: boolean;
}

interface Props {
  card: ImageCard;
  editing: boolean;
  selectedId: string | null;
  onPick: (at: ImagePoint) => void;
}

/** Image d'une carte. En mode édition : pipette avec loupe et repères des couleurs prélevées. */
export function ImagePicker({ card, editing, selectedId, onPick }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [probe, setProbe] = useState<Probe | null>(null);
  const pressed = useRef(false);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { pixels } = card;
  const rect = pixels && size.w > 0 ? containRect(size.w, size.h, pixels.width, pixels.height) : null;

  const locate = (e: PointerEvent<HTMLElement>): Probe => {
    const r = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX - r.left;
    const cy = e.clientY - r.top;
    return { cx, cy, at: rect ? toImagePoint(rect, cx, cy) : null, touch: e.pointerType !== 'mouse' };
  };

  const handlers = editing
    ? {
        onPointerDown: (e: PointerEvent<HTMLElement>) => {
          if (e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          pressed.current = true;
          setProbe(locate(e));
        },
        onPointerMove: (e: PointerEvent<HTMLElement>) => {
          if (pressed.current || e.pointerType === 'mouse') setProbe(locate(e));
        },
        onPointerUp: (e: PointerEvent<HTMLElement>) => {
          if (!pressed.current) return;
          pressed.current = false;
          const p = locate(e);
          if (p.at) onPick(p.at);
          setProbe(p.touch ? null : p);
        },
        onPointerLeave: () => {
          if (!pressed.current) setProbe(null);
        },
        onPointerCancel: () => {
          pressed.current = false;
          setProbe(null);
        },
      }
    : {};

  // Hors édition, la loupe disparaît.
  const shownProbe = editing ? probe : null;
  const markers = card.colors.filter((c) => c.at && (editing || c.id === selectedId));

  return (
    <div
      ref={box}
      className={`card-image${editing ? ' editing' : ''}`}
      data-noswipe={editing ? '' : undefined}
      {...handlers}
    >
      {card.url && <img src={card.url} alt={card.name} draggable={false} />}
      {rect &&
        markers.map((c) => (
          <span
            key={c.id}
            className={`marker${c.id === selectedId ? ' selected' : ''}`}
            style={{ left: rect.x + c.at!.x * rect.width, top: rect.y + c.at!.y * rect.height, background: c.hex }}
          />
        ))}
      {shownProbe?.at && pixels && <Loupe pixels={pixels} probe={shownProbe} at={shownProbe.at} box={size} />}
    </div>
  );
}

function Loupe({ pixels, probe, at, box }: { pixels: ImageData; probe: Probe; at: ImagePoint; box: { w: number; h: number } }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  // Copie des pixels dans un canvas, une fois par image, pour les agrandir rapidement.
  const source = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = pixels.width;
    c.height = pixels.height;
    c.getContext('2d')?.putImageData(pixels, 0, 0);
    return c;
  }, [pixels]);
  const [px, py] = pixelCoords(pixels, at);
  const [r, g, b] = pixelAt(pixels, at);
  const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, LOUPE, LOUPE);
    ctx.drawImage(source, px - RADIUS, py - RADIUS, RADIUS * 2 + 1, RADIUS * 2 + 1, 0, 0, LOUPE, LOUPE);
    const c = RADIUS * CELL;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    ctx.strokeRect(c - 1, c - 1, CELL + 2, CELL + 2);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(c + 1, c + 1, CELL - 2, CELL - 2);
  }, [source, px, py]);

  // Au doigt, la loupe se place au-dessus du doigt pour ne pas être cachée.
  const lift = probe.touch ? LOUPE + 48 : LOUPE + 24;
  let top = probe.cy - lift;
  if (top < 4) top = probe.cy + (probe.touch ? 48 : 24);
  const left = Math.min(Math.max(4, probe.cx - LOUPE / 2), Math.max(4, box.w - LOUPE - 4));

  return (
    <div className="loupe" style={{ left, top }} aria-hidden>
      <canvas ref={canvas} width={LOUPE} height={LOUPE} />
      <span className="loupe-hex">
        <span className="mini" style={{ background: hex }} />
        {hex}
      </span>
    </div>
  );
}
