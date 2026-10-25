import { useMemo } from 'react';
import { mixSteps } from '../engine';
import { fr } from '../i18n/fr';
import { RINGS, SECTORS, SHADE_LEVELS, TINT_LEVELS, shadeDisc, wheelPosition } from '../lib/wheel';
import type { PickedColor } from '../types';

const SIZE = 260;
const C = SIZE / 2;
const R = 118;

/** 0° en haut, sens horaire. */
function polar(angle: number, r: number): [number, number] {
  const a = ((angle - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

const place = (hex: string) => {
  const { angle, radius } = wheelPosition(hex);
  return polar(angle, radius * R);
};

/** Limites des anneaux de cases (nuances foncées puis pâles). */
const ringEdges = [
  ...Array.from({ length: SHADE_LEVELS + 1 }, (_, i) => RINGS.pure + ((RINGS.shadeEnd - RINGS.pure) * i) / SHADE_LEVELS),
  ...Array.from({ length: TINT_LEVELS - 1 }, (_, i) => RINGS.shadeEnd + ((1 - RINGS.shadeEnd) * (i + 1)) / TINT_LEVELS),
];

interface Props {
  colors: PickedColor[];
  /** Couleurs sélectionnées, dans l'ordre du passage. */
  chain: PickedColor[];
  steps: number;
  label: string;
  onToggle: (id: string) => void;
}

/**
 * Roue des nuances : teinte autour, pigments purs autour du centre noir, nuances foncées puis pâles vers le bord ;
 * tes couleurs placées dessus.
 * Le passage entre les couleurs sélectionnées est tracé avec ses nuances intermédiaires.
 */
export function ColorWheel({ colors, chain, steps, label, onToggle }: Props) {
  const disc = useMemo(() => shadeDisc(R * 4), []);
  const order = new Map(chain.map((c, i) => [c.id, i + 1]));
  // Les couleurs sélectionnées sont dessinées par-dessus les autres.
  const ordered = [...colors].sort((a, b) => Number(order.has(a.id)) - Number(order.has(b.id)));
  const path = chain.slice(1).flatMap((to, i) => mixSteps(chain[i].lab, to.lab, steps).slice(i === 0 ? 0 : 1));

  return (
    <svg className="wheel" viewBox={`0 0 ${SIZE} ${SIZE}`} role="group" aria-label={label}>
      <image href={disc} x={C - R} y={C - R} width={R * 2} height={R * 2} />
      <g className="wheel-grid" stroke="rgba(255,255,255,0.35)" strokeWidth={0.6} fill="none">
        {ringEdges.map((e) => (
          <circle key={e} cx={C} cy={C} r={R * e} />
        ))}
        {Array.from({ length: SECTORS }, (_, i) => {
          const [x1, y1] = polar((i * 360) / SECTORS, R * RINGS.pure);
          const [x2, y2] = polar((i * 360) / SECTORS, R);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </g>
      <circle cx={C} cy={C} r={R} fill="none" stroke="var(--border)" />

      {path.length > 1 && (
        <g className="wheel-path">
          <polyline
            points={path.map((s) => place(s.hex).join(',')).join(' ')}
            fill="none"
            stroke="#fff"
            strokeWidth={2}
            strokeDasharray="4 3"
          />
          {path.map((s, i) => {
            const [x, y] = place(s.hex);
            return <circle key={i} cx={x} cy={y} r={4} fill={s.hex} stroke="#fff" strokeWidth={1} />;
          })}
        </g>
      )}

      {ordered.map((c) => {
        const [x, y] = place(c.hex);
        const n = order.get(c.id) ?? null;
        const r = n ? 11 : 8;
        return (
          <g
            key={c.id}
            className="wheel-point"
            role="button"
            tabIndex={0}
            aria-pressed={n !== null}
            aria-label={fr.toggleColor(c.hex, n)}
            onClick={() => onToggle(c.id)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle(c.id)}
          >
            {/* Zone de toucher plus large que le point. */}
            <circle cx={x} cy={y} r={16} fill="transparent" />
            <circle cx={x} cy={y} r={r} fill="none" stroke="rgba(0,0,0,0.7)" strokeWidth={n ? 5 : 4} />
            <circle cx={x} cy={y} r={r} fill={c.hex} stroke="#fff" strokeWidth={n ? 3 : 2}>
              <title>{c.hex}</title>
            </circle>
            {n && (
              <text x={x} y={y} className="wheel-badge" textAnchor="middle" dominantBaseline="central">
                {n}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
