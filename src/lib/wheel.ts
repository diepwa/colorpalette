import { lchToHex, vividColor, type Lch } from '../engine';

/** Pas (en degrés) de la table des couleurs les plus saturées par teinte. */
const STEP = 2;

interface Vivid {
  C: number;
  rgb: [number, number, number];
}

/** Gris moyen du centre de la roue (OKLab L = 0,62), le même pour toutes les teintes. */
const CENTER_GRAY = 140;

let table: Vivid[] | null = null;

/** Couleur la plus saturée de chaque teinte (calculée une fois, à la première roue affichée). */
function vividTable(): Vivid[] {
  if (!table) {
    table = Array.from({ length: 360 / STEP }, (_, i) => {
      const v = vividColor(i * STEP);
      const hex = lchToHex(v);
      const n = parseInt(hex.slice(1), 16);
      return { C: v.C, rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255] };
    });
  }
  return table;
}

function vividAt(h: number): Vivid {
  const t = vividTable();
  const i = Math.round((((h % 360) + 360) % 360) / STEP) % t.length;
  return t[i];
}

/**
 * Place d'une couleur sur la roue : angle = teinte, rayon = saturation relative
 * (chroma divisé par le chroma maximal de cette teinte), avec une racine pour
 * étaler les couleurs peu saturées, qui sont nombreuses en peinture.
 */
export function wheelPosition(lch: Lch): { angle: number; radius: number } {
  const max = vividAt(lch.h).C;
  const s = max > 0 ? Math.min(1, lch.C / max) : 0;
  return { angle: lch.h, radius: Math.sqrt(s) };
}

const discs = new Map<number, string>();

/** Disque de saturation (gris au centre, teinte pure au bord), en image PNG mise en cache. */
export function saturationDisc(size: number): string {
  const cached = discs.get(size);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(size, size);
  const c = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - c;
      const dy = y + 0.5 - c;
      const r = Math.hypot(dx, dy) / c;
      if (r > 1) continue;
      // 0° en haut, sens horaire, comme les points.
      const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
      const v = vividAt(angle);
      const s = r * r;
      const o = (y * size + x) * 4;
      for (let k = 0; k < 3; k++) img.data[o + k] = Math.round(CENTER_GRAY + (v.rgb[k] - CENTER_GRAY) * s);
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const url = canvas.toDataURL();
  discs.set(size, url);
  return url;
}
