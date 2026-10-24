import { pickColor } from '../engine';
import type { PickedColor } from '../types';

/** Couleur prélevée de test, à partir d'un hex. */
export function picked(id: string, hex: string, categoryId: string | null, at?: { x: number; y: number }): PickedColor {
  const n = parseInt(hex.slice(1), 16);
  const { lab, lch } = pickColor((n >> 16) & 255, (n >> 8) & 255, n & 255);
  return { id, hex, lab, lch, categoryId, ...(at ? { at } : {}) };
}
