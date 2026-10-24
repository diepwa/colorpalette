import { describe, expect, it } from 'vitest';
import { hexToLch } from '../engine';
import { wheelPosition } from './wheel';

describe('place des couleurs sur la roue de saturation', () => {
  it('met les couleurs pures au bord et les gris au centre', () => {
    expect(wheelPosition(hexToLch('#ff0000')).radius).toBeCloseTo(1, 1);
    expect(wheelPosition(hexToLch('#808080')).radius).toBeLessThan(0.05);
  });

  it('donne une place hors du centre à un gris coloré comme #4e4243', () => {
    const { angle, radius } = wheelPosition(hexToLch('#4e4243'));
    expect(radius).toBeGreaterThan(0.2);
    expect(radius).toBeLessThan(0.5);
    // Gris légèrement rosé : teinte rouge (≈ 12°).
    expect(angle).toBeGreaterThan(0);
    expect(angle).toBeLessThan(30);
  });

  it('range les saturations dans l’ordre', () => {
    const r = ['#4e4243', '#7a3f45', '#b01e2a'].map((h) => wheelPosition(hexToLch(h)).radius);
    expect(r[0]).toBeLessThan(r[1]);
    expect(r[1]).toBeLessThan(r[2]);
  });
});
