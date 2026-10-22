import { lchToHex, vividColor } from '../engine';
import type { AnalysisResult, HarmonyScore } from '../engine';

const SIZE = 260;
const C = SIZE / 2;
const R = 104;
const RING = 16;
/** Chroma placé sur le bord du disque : au-delà, les points restent au bord. */
const CHROMA_MAX = 0.22;

// Anneau de teintes RVB, chaque teinte à sa saturation maximale.
const RING_COLORS = Array.from({ length: 72 }, (_, i) => lchToHex(vividColor(i * 5)));

/** 0° en haut, sens horaire. */
function polar(angle: number, r: number): [number, number] {
  const a = ((angle - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

function arc(a0: number, a1: number, r0: number, r1: number): string {
  const [x0, y0] = polar(a0, r1);
  const [x1, y1] = polar(a1, r1);
  const [x2, y2] = polar(a1, r0);
  const [x3, y3] = polar(a0, r0);
  return `M${x0} ${y0}A${r1} ${r1} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 0 0 ${x3} ${y3}Z`;
}

interface Props {
  analysis: AnalysisResult;
  harmony: HarmonyScore | undefined;
  label: string;
}

/** Roue RVB : couleurs de l'image placées par teinte et saturation, gabarit d'harmonie superposé. */
export function HarmonyWheel({ analysis, harmony, label }: Props) {
  const targets = harmony ? [...harmony.targets].sort((a, b) => a - b) : [];
  const outliers = new Set(harmony?.outliers.map((o) => o.hex));
  const points = [...analysis.points].sort((a, b) => b.color.proportion - a.color.proportion);

  return (
    <svg className="wheel" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={label}>
      {RING_COLORS.map((hex, i) => (
        <path key={i} d={arc(i * 5 - 2.6, i * 5 + 2.6, R + 4, R + 4 + RING)} fill={hex} />
      ))}
      {[0.33, 0.66, 1].map((f) => (
        <circle key={f} cx={C} cy={C} r={R * f} fill="none" stroke="var(--border)" />
      ))}
      {targets.length > 1 && (
        <polygon
          points={targets.map((t) => polar(t, R).join(',')).join(' ')}
          fill={targets.length > 2 ? 'rgba(255,255,255,0.05)' : 'none'}
          stroke="var(--text)"
          strokeWidth={1.25}
          strokeDasharray="4 3"
        />
      )}
      {targets.map((t) => {
        const [x, y] = polar(t, R);
        return <line key={`l${t}`} x1={C} y1={C} x2={x} y2={y} stroke="var(--text)" strokeOpacity={0.25} />;
      })}
      {points.map((p) => {
        const [x, y] = polar(p.angle, Math.min(1, p.color.lch.C / CHROMA_MAX) * R);
        const out = outliers.has(p.color.hex);
        return (
          <circle
            key={p.color.hex + p.color.proportion}
            cx={x}
            cy={y}
            r={4.5 + Math.sqrt(p.color.proportion) * 22}
            fill={p.color.hex}
            stroke={out ? '#ff8a8a' : 'var(--text)'}
            strokeWidth={out ? 1.5 : 1}
            strokeDasharray={out ? '2 2' : undefined}
          />
        );
      })}
      {targets.map((t) => {
        const [x, y] = polar(t, R);
        return (
          <path
            key={`d${t}`}
            d={`M${x} ${y - 7}L${x + 7} ${y}L${x} ${y + 7}L${x - 7} ${y}Z`}
            fill={lchToHex(vividColor(t))}
            stroke="var(--text)"
            strokeWidth={1.5}
          />
        );
      })}
      <circle cx={C} cy={C} r={2.5} fill="var(--text-muted)" />
    </svg>
  );
}
