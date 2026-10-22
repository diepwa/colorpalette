import { fitToGamut, lchToHex, normalizeHue, type Lch } from './color';
import { hueToWheel, wheelToHue, type Wheel } from './wheel';

export type HarmonyType =
  | 'complementary'
  | 'splitComplementary'
  | 'triadic'
  | 'tetradic'
  | 'square'
  | 'analogous'
  | 'monochrome';

export const HARMONY_TYPES: HarmonyType[] = [
  'complementary',
  'splitComplementary',
  'triadic',
  'tetradic',
  'square',
  'analogous',
  'monochrome',
];

export const DEFAULT_ANALOGOUS_WIDTH = 30;

/** Décalages de teinte (sur la roue) par rapport à la base. */
export function harmonyOffsets(type: HarmonyType, analogousWidth = DEFAULT_ANALOGOUS_WIDTH): number[] {
  switch (type) {
    case 'complementary':
      return [0, 180];
    case 'splitComplementary':
      return [0, 150, 210];
    case 'triadic':
      return [0, 120, 240];
    case 'tetradic':
      return [0, 60, 180, 240];
    case 'square':
      return [0, 90, 180, 270];
    case 'analogous':
      return [0, analogousWidth, -analogousWidth];
    case 'monochrome':
      return [0];
  }
}

export interface HarmonyColor {
  lch: Lch;
  hex: string;
  /** Angle sur la roue utilisée pour le calcul. */
  wheelAngle: number;
}

export interface HarmonyOptions {
  wheel?: Wheel;
  /** Luminosité imposée ; par défaut celle de la base. */
  lightness?: number;
  /** Chroma imposé ; par défaut celui de la base. */
  chroma?: number;
  analogousWidth?: number;
}

const MONOCHROME_LIGHTNESS_STEPS = [-0.3, -0.15, 0, 0.15, 0.3];

export function generateHarmony(base: Lch, type: HarmonyType, options: HarmonyOptions = {}): HarmonyColor[] {
  const wheel = options.wheel ?? 'ryb';
  const L = options.lightness ?? base.L;
  const C = options.chroma ?? base.C;
  const baseAngle = hueToWheel(base.h, wheel);

  const make = (lch: Lch, wheelAngle: number): HarmonyColor => {
    const fitted = fitToGamut(lch);
    return { lch: fitted, hex: lchToHex(fitted), wheelAngle };
  };

  if (type === 'monochrome') {
    return MONOCHROME_LIGHTNESS_STEPS.map((dl) =>
      make({ L: Math.min(0.97, Math.max(0.15, L + dl)), C, h: base.h }, baseAngle),
    );
  }

  return harmonyOffsets(type, options.analogousWidth).map((offset) => {
    const angle = normalizeHue(baseAngle + offset);
    // Le décalage 0 garde la teinte exacte de la base (pas d'aller-retour par la table).
    const h = offset === 0 ? base.h : wheelToHue(angle, wheel);
    return make({ L, C, h }, angle);
  });
}
