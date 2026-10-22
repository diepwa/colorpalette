import { describe, expect, it } from 'vitest';
import { hexToLch, hueDistance, isInSrgbGamut } from '../color';
import { generateHarmony, HARMONY_TYPES, harmonyOffsets } from '../harmonies';

const base = hexToLch('#3a7bd5');

describe('harmonies', () => {
  it('a les bons décalages en RVB', () => {
    for (const type of HARMONY_TYPES.filter((t) => t !== 'monochrome')) {
      const colors = generateHarmony(base, type, { wheel: 'rgb' });
      const offsets = harmonyOffsets(type);
      expect(colors).toHaveLength(offsets.length);
      colors.forEach((c, i) => expect(hueDistance(c.lch.h, base.h + offsets[i])).toBeLessThan(1e-6));
    }
  });

  it('garde la couleur de base en premier', () => {
    for (const wheel of ['ryb', 'rgb'] as const) {
      const [first] = generateHarmony(base, 'triadic', { wheel });
      expect(first.hex).toBe('#3a7bd5');
    }
  });

  it('largeur d’analogue réglable', () => {
    const colors = generateHarmony(base, 'analogous', { wheel: 'rgb', analogousWidth: 45 });
    expect(hueDistance(colors[1].lch.h, base.h + 45)).toBeLessThan(1e-6);
    expect(hueDistance(colors[2].lch.h, base.h - 45)).toBeLessThan(1e-6);
  });

  it('ne génère jamais de couleur hors sRGB', () => {
    const vivid = { L: 0.75, C: 0.35, h: 0 };
    for (let h = 0; h < 360; h += 15) {
      for (const type of HARMONY_TYPES) {
        for (const wheel of ['ryb', 'rgb'] as const) {
          for (const c of generateHarmony({ ...vivid, h }, type, { wheel })) {
            expect(isInSrgbGamut(c.lch)).toBe(true);
            expect(c.hex).toMatch(/^#[0-9a-f]{6}$/);
          }
        }
      }
    }
  });

  it('monochrome garde la teinte et fait varier la luminosité', () => {
    const colors = generateHarmony(base, 'monochrome');
    expect(new Set(colors.map((c) => c.hex)).size).toBe(colors.length);
    colors.forEach((c) => expect(c.lch.h).toBe(base.h));
  });

  it('respecte L et C imposés', () => {
    const colors = generateHarmony(base, 'complementary', { wheel: 'rgb', lightness: 0.5, chroma: 0.05 });
    colors.forEach((c) => {
      expect(c.lch.L).toBe(0.5);
      expect(c.lch.C).toBeCloseTo(0.05, 6);
    });
  });
});
