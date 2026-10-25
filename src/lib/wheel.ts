import { rgb8ToOklab, type Lab } from '../engine';

/**
 * Roue des nuances, comme les roues de peintre : teinte autour (jaune en haut,
 * rouge à droite, bleu en bas), et du centre vers le bord les gris, un anneau
 * des pigments purs, les nuances foncées (pigment + noir) jusqu'au pigment pur,
 * puis les nuances pâles (pigment + blanc).
 */

/** Rayons relatifs des zones de la roue. */
export const RINGS = {
  /** Disque des gris au centre, du noir (milieu) au blanc (bord). */
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
/** En dessous de ce chroma OKLCH, une couleur est un gris : elle va au centre. */
const GRAY = 0.012;

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


const labOf = (c: Rgb): Lab => rgb8ToOklab(Math.round(c[0] * 255), Math.round(c[1] * 255), Math.round(c[2] * 255));

/** Gris de clarté OKLab L, en RVB 0–1. */
function gray(L: number): Rgb {
  const lin = Math.max(0, Math.min(1, L)) ** 3;
  const v = lin <= 0.0031308 ? 12.92 * lin : 1.055 * lin ** (1 / 2.4) - 0.055;
  return [v, v, v];
}

interface Cell {
  radius: number;
  lab: Lab;
}

let cells: Cell[][] | null = null;

/** Cases de chaque secteur (rayon au milieu de la case, couleur en OKLab), calculées une fois. */
function sectorCells(): Cell[][] {
  if (!cells) {
    cells = Array.from({ length: SECTORS }, (_, sector) => {
      const angle = (sector + 0.5) * (360 / SECTORS);
      const radii = [
        ...Array.from({ length: SHADE_LEVELS }, (_, i) => RINGS.pure + (i + 0.5) * SHADE_W),
        ...Array.from({ length: TINT_LEVELS }, (_, i) => RINGS.shadeEnd + (i + 0.5) * TINT_W),
      ];
      return radii.map((radius) => ({ radius, lab: labOf(discColor(radius, angle)!) }));
    });
  }
  return cells;
}

/**
 * Place d'une couleur sur la roue : angle = sa teinte ; rayon = la case de cette
 * teinte qui lui ressemble le plus à l'œil (distance OKLab, qui compte autant la
 * clarté que la couleur). Les gris vont au centre, plus clairs vers le bord du disque.
 * Le point garde la vraie couleur.
 */
export function wheelPosition(hex: string): { angle: number; radius: number } {
  const c = hexToRgb(hex);
  const angle = angleOf(hueSat(c).h);
  const lab = labOf(c);
  if (Math.hypot(lab.a, lab.b) < GRAY) return { angle, radius: Math.min(0.95, Math.max(0.05, lab.L)) * RINGS.black };
  const sector = Math.min(SECTORS - 1, Math.floor(angle / (360 / SECTORS)));
  let best = sectorCells()[sector][0];
  let bestD = Infinity;
  for (const cell of sectorCells()[sector]) {
    const d = Math.hypot(cell.lab.L - lab.L, cell.lab.a - lab.a, cell.lab.b - lab.b);
    if (d < bestD) {
      bestD = d;
      best = cell;
    }
  }
  return { angle, radius: best.radius };
}

let disc: string | null = null;

/** Couleur d'un point du disque, en RVB 0–1 (null hors de la roue). */
export function discColor(r: number, angle: number): Rgb | null {
  if (r > 1) return null;
  if (r < RINGS.black) return gray(r / RINGS.black);
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
