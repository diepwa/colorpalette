import { labToLch, lchToHex, type Lab, type Lch } from './color';

export interface MixStep {
  /** Part de la couleur 2, de 0 (couleur 1 pure) à 1 (couleur 2 pure). */
  t: number;
  lab: Lab;
  lch: Lch;
  hex: string;
}

/**
 * Transition de la couleur 1 à la couleur 2 en `steps` nuances (extrémités comprises),
 * interpolée dans OKLab pour des écarts réguliers à l'œil.
 */
export function mixSteps(from: Lab, to: Lab, steps: number): MixStep[] {
  const n = Math.max(2, Math.round(steps));
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const lab = { L: from.L + (to.L - from.L) * t, a: from.a + (to.a - from.a) * t, b: from.b + (to.b - from.b) * t };
    const lch = labToLch(lab);
    return { t, lab, lch, hex: lchToHex(lch) };
  });
}
