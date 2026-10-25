/**
 * Roue des nuances, comme les roues de peintre : teinte autour (jaune en haut,
 * rouge à droite, bleu en bas), et du centre vers le bord le noir, un anneau
 * des pigments purs, les nuances foncées (pigment + noir) jusqu'au pigment pur,
 * puis les nuances pâles (pigment + blanc).
 */

/** Rayons relatifs des zones de la roue. */
export const RINGS = {
  /** Disque noir du centre, où vont aussi les gris. */
  black: 0.16,
  /** Anneau des pigments purs, de black à pure. */
  pure: 0.24,
  /** Fin des nuances foncées : le dernier anneau est le pigment pur. */
  shadeEnd: 0.8,
};
/** Nombre de secteurs de teinte. */
export const SECTORS = 36;
/** Anneaux de nuances foncées (le dernier est le pigment pur) et de nuances pâles. */
export const SHADE_LEVELS = 8;
export const TINT_LEVELS = 3;

const SHADE_W = (RINGS.shadeEnd - RINGS.pure) / SHADE_LEVELS;
const TINT_W = (1 - RINGS.shadeEnd) / TINT_LEVELS;
/** Pâleur du dernier anneau : part de blanc (1 = blanc pur). */
const MAX_TINT = 0.75;
/** En dessous de cette saturation, une couleur est un gris : elle va au centre. */
const GRAY = 0.06;

type Rgb = [number, number, number];

function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Teinte et saturation TSV (0–360, 0–1) d'une couleur RVB. */
function hueSat([r, g, b]: Rgb): { h: number; s: number } {
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return { h: 0, s: 0 };
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s: d / max };
}

/** Pigment pur (saturation et valeur maximales) d'une teinte TSV. */
function pure(h: number): Rgb {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return 1 - Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [f(5), f(3), f(1)];
}

/** Angle sur la roue (0° en haut, sens horaire) d'une teinte TSV : jaune en haut, rouge à droite. */
const angleOf = (h: number) => (((60 - h) % 360) + 360) % 360;
const hueOf = (angle: number) => (((60 - angle) % 360) + 360) % 360;

const dist = (a: Rgb, b: Rgb) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Place d'une couleur sur la roue : angle = sa teinte ; rayon = la nuance foncée
 * (pigment × valeur) ou pâle (pigment + blanc) de cette teinte la plus proche.
 * Les gris vont au centre. Le point garde la vraie couleur, le fond montre la nuance la plus proche.
 */
export function wheelPosition(hex: string): { angle: number; radius: number } {
  const c = hexToRgb(hex);
  const { h, s } = hueSat(c);
  const angle = angleOf(h);
  if (s < GRAY) return { angle, radius: RINGS.black / 2 };
  const p = pure(h);
  // Nuance foncée la plus proche : projection sur le segment noir → pigment.
  const v = clamp01((c[0] * p[0] + c[1] * p[1] + c[2] * p[2]) / (p[0] ** 2 + p[1] ** 2 + p[2] ** 2));
  const shade: Rgb = [p[0] * v, p[1] * v, p[2] * v];
  // Nuance pâle la plus proche : projection sur le segment pigment → blanc.
  const u = [1 - p[0], 1 - p[1], 1 - p[2]];
  const w = clamp01(((c[0] - p[0]) * u[0] + (c[1] - p[1]) * u[1] + (c[2] - p[2]) * u[2]) / (u[0] ** 2 + u[1] ** 2 + u[2] ** 2));
  const tint: Rgb = [p[0] + u[0] * w, p[1] + u[1] * w, p[2] + u[2] * w];
  // Rayons au milieu des anneaux : v = 1 et w = 0 tombent tous deux au milieu de l'anneau du pigment pur.
  const radius =
    dist(c, shade) <= dist(c, tint)
      ? Math.max(RINGS.pure, RINGS.pure + (v * SHADE_LEVELS - 0.5) * SHADE_W)
      : Math.min(1, RINGS.shadeEnd + ((w / MAX_TINT) * TINT_LEVELS - 0.5) * TINT_W);
  return { angle, radius };
}

let disc: string | null = null;

/** Couleur d'un point du disque, en RVB 0–1 (null hors de la roue). */
export function discColor(r: number, angle: number): Rgb | null {
  if (r > 1) return null;
  if (r < RINGS.black) return [0, 0, 0];
  if (r < RINGS.pure) return pure(hueOf(angle));
  // Au-delà de l'anneau intérieur, des cases : une teinte par secteur, une nuance par anneau.
  const sector = Math.floor(angle / (360 / SECTORS));
  const p = pure(hueOf((sector + 0.5) * (360 / SECTORS)));
  if (r < RINGS.shadeEnd) {
    const v = (Math.floor((r - RINGS.pure) / SHADE_W) + 1) / SHADE_LEVELS;
    return [p[0] * v, p[1] * v, p[2] * v];
  }
  const w = ((Math.min(TINT_LEVELS - 1, Math.floor((r - RINGS.shadeEnd) / TINT_W)) + 1) / TINT_LEVELS) * MAX_TINT;
  return [p[0] + (1 - p[0]) * w, p[1] + (1 - p[1]) * w, p[2] + (1 - p[2]) * w];
}

/** Disque des nuances en image PNG, calculé une fois. */
export function shadeDisc(size: number): string {
  if (disc) return disc;
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
      // 0° en haut, sens horaire, comme les points.
      const angle = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
      const rgb = discColor(Math.hypot(dx, dy) / c, angle);
      if (!rgb) continue;
      const o = (y * size + x) * 4;
      img.data[o] = Math.round(rgb[0] * 255);
      img.data[o + 1] = Math.round(rgb[1] * 255);
      img.data[o + 2] = Math.round(rgb[2] * 255);
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  disc = canvas.toDataURL();
  return disc;
}
