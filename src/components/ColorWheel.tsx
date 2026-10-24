import { useMemo } from 'react';
import { saturationDisc, wheelPosition } from '../lib/wheel';
import type { PickedColor } from '../types';

const SIZE = 260;
const C = SIZE / 2;
const R = 118;

/** 0° en haut, sens horaire. */
function polar(angle: number, r: number): [number, number] {
  const a = ((angle - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

interface Props {
  colors: PickedColor[];
  highlightId: string | null;
  label: string;
}

/** Roue RVB de saturation : teinte autour, gris au centre, teinte pure au bord ; tes couleurs placées dessus. */
export function ColorWheel({ colors, highlightId, label }: Props) {
  const disc = useMemo(() => saturationDisc(R * 4), []);
  // La couleur mise en avant est dessinée en dernier, au-dessus des autres.
  const ordered = [...colors].sort((a, b) => Number(a.id === highlightId) - Number(b.id === highlightId));

  return (
    <svg className="wheel" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={label}>
      <image href={disc} x={C - R} y={C - R} width={R * 2} height={R * 2} />
      {[0.25, 0.5, 0.75].map((s) => (
        <circle key={s} cx={C} cy={C} r={R * Math.sqrt(s)} fill="none" stroke="rgba(255,255,255,0.18)" />
      ))}
      <circle cx={C} cy={C} r={R} fill="none" stroke="var(--border)" />
      {ordered.map((c) => {
        const { angle, radius } = wheelPosition(c.lch);
        const [x, y] = polar(angle, radius * R);
        const on = c.id === highlightId;
        return (
          <g key={c.id}>
            <circle cx={x} cy={y} r={on ? 11 : 8} fill="none" stroke="rgba(0,0,0,0.7)" strokeWidth={on ? 5 : 4} />
            <circle cx={x} cy={y} r={on ? 11 : 8} fill={c.hex} stroke="#fff" strokeWidth={on ? 3 : 2}>
              <title>{c.hex}</title>
            </circle>
          </g>
        );
      })}
    </svg>
  );
}
