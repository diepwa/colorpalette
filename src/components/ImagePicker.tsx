import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { fr } from '../i18n/fr';
import { containRect, pixelAt, pixelCoords, toImagePoint } from '../lib/loadImage';
import { clampView, zoomAt, type View } from '../lib/zoom';
import type { ImageCard, ImagePoint } from '../types';

const LOUPE = 120;
/** Pixels visibles dans la loupe, de chaque côté du pixel visé. */
const RADIUS = 7;
const CELL = LOUPE / (RADIUS * 2 + 1);
const IDENTITY: View = { scale: 1, tx: 0, ty: 0 };

interface Probe {
  /** Position dans le cadre, en px. */
  cx: number;
  cy: number;
  at: ImagePoint | null;
  touch: boolean;
}

type Gesture =
  | { kind: 'pick' }
  | { kind: 'pan'; x0: number; y0: number; view0: View }
  | { kind: 'pinch'; dist0: number; mid0: { x: number; y: number }; view0: View };

interface Props {
  card: ImageCard;
  editing: boolean;
  showMarkers: boolean;
  selectedId: string | null;
  onPick: (at: ImagePoint) => void;
}

/**
 * Image d'une carte, zoomable (pincement, molette, boutons) sans toucher au reste de l'écran.
 * En mode édition : pipette avec loupe. Les repères montrent où les couleurs ont été prises.
 */
export function ImagePicker({ card, editing, showMarkers, selectedId, onPick }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>(IDENTITY);
  const [probe, setProbe] = useState<Probe | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  // Après un pincement, le doigt restant ne prélève rien en se levant.
  const pinched = useRef(false);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { pixels } = card;
  const rect = pixels && size.w > 0 ? containRect(size.w, size.h, pixels.width, pixels.height) : null;
  const zoomed = view.scale > 1.001;

  const boxPoint = (e: { clientX: number; clientY: number }) => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  // Point du cadre → position sur l'image, en défaisant le zoom.
  const locate = (e: PointerEvent<HTMLElement>): Probe => {
    const { x, y } = boxPoint(e);
    const at = rect ? toImagePoint(rect, (x - view.tx) / view.scale, (y - view.ty) / view.scale) : null;
    return { cx: x, cy: y, at, touch: e.pointerType !== 'mouse' };
  };

  const setClamped = (next: View) => setView(clampView(next, size.w, size.h));

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return;
    pointers.current.set(e.pointerId, boxPoint(e));
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = {
        kind: 'pinch',
        dist0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        mid0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        view0: view,
      };
      pinched.current = true;
      setProbe(null);
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
    if (pointers.current.size > 2) return;
    pinched.current = false;
    if (editing) {
      gesture.current = { kind: 'pick' };
      setProbe(locate(e));
      e.currentTarget.setPointerCapture(e.pointerId);
    } else if (zoomed) {
      const p = boxPoint(e);
      gesture.current = { kind: 'pan', x0: p.x, y0: p.y, view0: view };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, boxPoint(e));
    const g = gesture.current;
    if (g?.kind === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      // Le point de l'image sous le milieu des doigts reste sous les doigts.
      const scale = g.view0.scale * (dist / g.dist0);
      const cx = (g.mid0.x - g.view0.tx) / g.view0.scale;
      const cy = (g.mid0.y - g.view0.ty) / g.view0.scale;
      setClamped({ scale, tx: mid.x - cx * scale, ty: mid.y - cy * scale });
    } else if (g?.kind === 'pan') {
      const p = boxPoint(e);
      setClamped({ ...g.view0, tx: g.view0.tx + p.x - g.x0, ty: g.view0.ty + p.y - g.y0 });
    } else if (editing && (g?.kind === 'pick' || (!g && e.pointerType === 'mouse'))) {
      setProbe(locate(e));
    }
  };

  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    if (!pointers.current.delete(e.pointerId)) return;
    const g = gesture.current;
    if (g?.kind === 'pick' && !pinched.current) {
      const p = locate(e);
      if (p.at) onPick(p.at);
      setProbe(p.touch ? null : p);
    }
    if (pointers.current.size === 0) {
      gesture.current = null;
      pinched.current = false;
    } else if (g?.kind === 'pinch') {
      gesture.current = null;
    }
  };

  const onPointerCancel = (e: PointerEvent<HTMLElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) gesture.current = null;
    setProbe(null);
  };

  const onWheel = (e: WheelEvent<HTMLElement>) => {
    const { x, y } = boxPoint(e);
    setClamped(zoomAt(view, Math.exp(-e.deltaY * 0.002), x, y));
  };

  const zoomBy = (factor: number) => setClamped(zoomAt(view, factor, size.w / 2, size.h / 2));

  const shownProbe = editing ? probe : null;
  const markers = showMarkers ? card.colors.filter((c) => c.at) : [];

  return (
    <div
      ref={box}
      className={`card-image${editing ? ' editing' : ''}`}
      data-noswipe={editing || zoomed ? '' : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={() => !gesture.current && setProbe(null)}
      onWheel={onWheel}
    >
      {card.url && (
        <img
          src={card.url}
          alt={card.name}
          draggable={false}
          style={{ transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})` }}
        />
      )}
      {rect &&
        markers.map((c) => (
          <span
            key={c.id}
            className={`marker${c.id === selectedId ? ' selected' : ''}`}
            style={{
              left: view.tx + (rect.x + c.at!.x * rect.width) * view.scale,
              top: view.ty + (rect.y + c.at!.y * rect.height) * view.scale,
              background: c.hex,
            }}
          />
        ))}
      {shownProbe?.at && pixels && <Loupe pixels={pixels} probe={shownProbe} at={shownProbe.at} box={size} />}
      {card.status === 'ready' && (
        <div className="zoom-controls">
          {zoomed && (
            <button type="button" aria-label={fr.zoomReset} title={fr.zoomReset} onClick={() => setView(IDENTITY)}>
              1:1
            </button>
          )}
          <button type="button" aria-label={fr.zoomOut} title={fr.zoomOut} disabled={!zoomed} onClick={() => zoomBy(1 / 1.5)}>
            −
          </button>
          <button type="button" aria-label={fr.zoomIn} title={fr.zoomIn} onClick={() => zoomBy(1.5)}>
            +
          </button>
        </div>
      )}
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
