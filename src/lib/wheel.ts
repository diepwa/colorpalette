import { isInSrgbGamut, type Lch } from '../engine';

/** Pas (en degrés) des tables de chroma maximal par teinte. */
const STEP = 2;
/** Pas de clarté des tables et des disques mis en cache. */
const L_STEP = 0.01;
/** En dessous, la clarté est trop proche du noir ou du blanc pour parler de saturation. */
const MIN_CMAX = 0.02;

const tables = new Map<number, Float64Array>();

const roundL = (L: number) => Math.round(Math.min(0.99, Math.max(0.01, L)) / L_STEP) * L_STEP;

/** Chroma maximal dans sRGB pour chaque teinte, à une clarté donnée (calculé une fois par clarté). */
function cmaxTable(L: number): Float64Array {
  const key = roundL(L);
  let t = tables.get(key);
  if (!t) {
    t = new Float64Array(360 / STEP);
    for (let i = 0; i < t.length; i++) {
      let lo = 0;
      let hi = 0.4;
      for (let k = 0; k < 18; k++) {
        const mid = (lo + hi) / 2;
        if (isInSrgbGamut({ L: key, C: mid, h: i * STEP })) lo = mid;
        else hi = mid;
      }
      t[i] = lo;
    }
    tables.set(key, t);
  }
  return t;
}

/** Chroma maximal de la teinte h à la clarté L, avec interpolation entre deux pas de la table. */
export function maxChroma(L: number, h: number): number {
  const t = cmaxTable(L);
  const x = (((h % 360) + 360) % 360) / STEP;
  const i = Math.floor(x) % t.length;
  const f = x - Math.floor(x);
  return t[i] * (1 - f) + t[(i + 1) % t.length] * f;
}

/**
 * Place d'une couleur sur la roue : angle = teinte, rayon = saturation relative
 * (chroma divisé par le chroma maximal de cette teinte à la même clarté), avec
 * une racine pour étaler les couleurs peu saturées, nombreuses en peinture.
 * Le disque dessiné à la clarté de la couleur montre donc exactement cette
 * couleur sous son point.
 */
export function wheelPosition(lch: Lch): { angle: number; radius: number } {
  const max = Math.max(MIN_CMAX, maxChroma(lch.L, lch.h));
  const s = Math.min(1, lch.C / max);
  return { angle: lch.h, radius: Math.sqrt(s) };
}

const toByte = (v: number) => {
  const c = v <= 0 ? 0 : v >= 1 ? 1 : v;
  return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055));
};

const discs = new Map<string, string>();

/**
 * Disque de saturation à une clarté donnée : gris de cette clarté au centre,
 * couleur la plus saturée possible au bord, en image PNG mise en cache.
 */
export function saturationDisc(size: number, lightness: number): string {
  const L = roundL(lightness);
  const key = `${size}:${L.toFixed(2)}`;
  const cached = discs.get(key);
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
      const h = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
      // Même échelle que wheelPosition : saturation relative = rayon².
      const C = r * r * Math.max(MIN_CMAX, maxChroma(L, h));
      const rad = (h * Math.PI) / 180;
      const a = C * Math.cos(rad);
      const b = C * Math.sin(rad);
      const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
      const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
      const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
      const o = (y * size + x) * 4;
      img.data[o] = toByte(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
      img.data[o + 1] = toByte(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
      img.data[o + 2] = toByte(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const url = canvas.toDataURL();
  discs.set(key, url);
  return url;
}
