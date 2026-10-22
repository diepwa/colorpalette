import { describe, expect, it } from 'vitest';
import { fitToGamut, hexToLch, hueDistance, isInSrgbGamut, lchToHex, vividColor } from '../color';

describe('distance de teinte', () => {
  it('est circulaire', () => {
    expect(hueDistance(350, 10)).toBe(20);
    expect(hueDistance(10, 350)).toBe(20);
    expect(hueDistance(0, 180)).toBe(180);
    expect(hueDistance(-30, 30)).toBe(60);
  });
});

describe('conversions sRGB <-> OKLCH', () => {
  it.each(['#ff0000', '#00ff00', '#0000ff', '#808080', '#1a2b3c', '#ffffff', '#000000', '#c8a165'])(
    'aller-retour sans perte pour %s',
    (hex) => {
      expect(lchToHex(hexToLch(hex))).toBe(hex);
    },
  );

  it('donne les valeurs OKLCH de référence du rouge', () => {
    const red = hexToLch('#ff0000');
    expect(red.L).toBeCloseTo(0.628, 3);
    expect(red.C).toBeCloseTo(0.2577, 3);
    expect(red.h).toBeCloseTo(29.23, 1);
  });
});

describe('gamut', () => {
  it('réduit le chroma d’une couleur hors sRGB en gardant L et h', () => {
    const out = { L: 0.7, C: 0.4, h: 200 };
    expect(isInSrgbGamut(out)).toBe(false);
    const fitted = fitToGamut(out);
    expect(fitted.L).toBe(0.7);
    expect(fitted.h).toBe(200);
    expect(fitted.C).toBeLessThan(0.4);
    expect(isInSrgbGamut(fitted)).toBe(true);
  });

  it('laisse intacte une couleur déjà dans la gamme', () => {
    const inside = hexToLch('#5a7d9a');
    expect(fitToGamut(inside).C).toBeCloseTo(inside.C, 6);
  });
});

describe('couleur la plus vive d’une teinte', () => {
  it.each([
    ['#ff0000'],
    ['#ffff00'],
    ['#00ff00'],
    ['#0000ff'],
  ])('retrouve %s pour sa teinte', (hex) => {
    const vivid = lchToHex(vividColor(hexToLch(hex).h));
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(vivid.slice(i, i + 2), 16));
    const [er, eg, eb] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    expect(Math.max(Math.abs(r - er), Math.abs(g - eg), Math.abs(b - eb))).toBeLessThanOrEqual(12);
  });
});
