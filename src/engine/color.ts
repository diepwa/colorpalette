import { formatHex } from 'culori';

/** Couleur dans l'espace OKLab. */
export interface Lab {
  L: number;
  a: number;
  b: number;
}

/** Couleur dans l'espace OKLCH ; h en degrés [0, 360). */
export interface Lch {
  L: number;
  C: number;
  h: number;
}

export function normalizeHue(h: number): number {
  const r = h % 360;
  return r < 0 ? r + 360 : r;
}

/** Distance angulaire circulaire, dans [0, 180]. */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(normalizeHue(a) - normalizeHue(b));
  return Math.min(d, 360 - d);
}

// Table de linéarisation sRGB pour les 256 valeurs 8 bits : le chemin des pixels
// passe par ici des centaines de milliers de fois, d'où la conversion maison.
const SRGB_TO_LINEAR = new Float64Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  SRGB_TO_LINEAR[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** sRGB 8 bits vers OKLab (matrices de Björn Ottosson). */
export function rgb8ToOklab(r: number, g: number, b: number): Lab {
  const lr = SRGB_TO_LINEAR[r];
  const lg = SRGB_TO_LINEAR[g];
  const lb = SRGB_TO_LINEAR[b];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

export function labToLch({ L, a, b }: Lab): Lch {
  const C = Math.hypot(a, b);
  const h = C < 1e-7 ? 0 : normalizeHue((Math.atan2(b, a) * 180) / Math.PI);
  return { L, C, h };
}

export function lchToLab({ L, C, h }: Lch): Lab {
  const rad = (h * Math.PI) / 180;
  return { L, a: C * Math.cos(rad), b: C * Math.sin(rad) };
}

export function labDistance(p: Lab, q: Lab): number {
  return Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b);
}

/**
 * Ramène une couleur OKLCH dans le gamut sRGB en réduisant le chroma par dichotomie
 * (teinte et luminosité conservées), jamais par troncature canal par canal.
 */
export function fitToGamut(lch: Lch): Lch {
  const L = Math.min(1, Math.max(0, lch.L));
  if (isInSrgbGamut({ ...lch, L })) return { ...lch, L };
  let lo = 0;
  let hi = lch.C;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (isInSrgbGamut({ L, C: mid, h: lch.h })) lo = mid;
    else hi = mid;
  }
  return { L, C: lo, h: lch.h };
}

/** Hex sRGB d'une couleur OKLCH, après mise en gamut. */
export function lchToHex(lch: Lch): string {
  const { L, C, h } = fitToGamut(lch);
  return formatHex({ mode: 'oklch', l: L, c: C, h });
}

export function hexToLch(hex: string): Lch {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) throw new Error(`Hex invalide : ${hex}`);
  return labToLch(rgb8ToOklab(parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)));
}

export function isInSrgbGamut(lch: Lch, eps = 1e-4): boolean {
  const { L, a, b } = lchToLab(lch);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return rgb.every((v) => v >= -eps && v <= 1 + eps);
}
