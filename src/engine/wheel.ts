import { normalizeHue } from './color';
import rybTable from './rybTable.json';

/** 'ryb' : roue rouge-jaune-bleu des peintres ; 'rgb' : rotation directe de la teinte OKLCH. */
export type Wheel = 'ryb' | 'rgb';

export interface RybAnchor {
  name: string;
  ryb: number;
  oklch: number;
}

export const DEFAULT_RYB_ANCHORS: RybAnchor[] = rybTable.anchors;

/**
 * Interpolation linéaire sur un cercle : xs et ys sont croissants sur un tour
 * (ys peut dépasser 360, il est « déroulé »).
 */
function interpolateCircular(x: number, xs: number[], ys: number[]): number {
  const x0 = xs[0];
  let v = normalizeHue(x - x0) + x0;
  const px = [...xs, x0 + 360];
  const py = [...ys, ys[0] + 360];
  for (let i = 0; i < px.length - 1; i++) {
    if (v >= px[i] && v <= px[i + 1]) {
      const t = (v - px[i]) / (px[i + 1] - px[i]);
      v = py[i] + t * (py[i + 1] - py[i]);
      return normalizeHue(v);
    }
  }
  return normalizeHue(ys[0]);
}

/** Déroule une suite d'angles pour qu'elle soit strictement croissante. */
function unwrap(values: number[]): number[] {
  const out: number[] = [];
  for (const v of values) {
    let u = v;
    while (out.length && u <= out[out.length - 1]) u += 360;
    out.push(u);
  }
  return out;
}

export function createRybMapping(anchors: RybAnchor[] = DEFAULT_RYB_ANCHORS) {
  const sorted = [...anchors].sort((p, q) => p.ryb - q.ryb);
  const ryb = unwrap(sorted.map((a) => a.ryb));
  const oklch = unwrap(sorted.map((a) => a.oklch));
  return {
    toRyb: (hue: number) => interpolateCircular(hue, oklch, ryb),
    fromRyb: (angle: number) => interpolateCircular(angle, ryb, oklch),
  };
}

const defaultRyb = createRybMapping();

/** Teinte OKLCH -> angle sur la roue choisie. */
export function hueToWheel(hue: number, wheel: Wheel): number {
  return wheel === 'ryb' ? defaultRyb.toRyb(hue) : normalizeHue(hue);
}

/** Angle sur la roue choisie -> teinte OKLCH. */
export function wheelToHue(angle: number, wheel: Wheel): number {
  return wheel === 'ryb' ? defaultRyb.fromRyb(angle) : normalizeHue(angle);
}
