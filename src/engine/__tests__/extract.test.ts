import { describe, expect, it } from 'vitest';
import { hexToLch, labDistance, rgb8ToOklab } from '../color';
import { extractPalette, pickColor } from '../extract';
import { addNoise, flatImage } from './helpers';

const lab = (hex: string) => rgb8ToOklab(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16));

describe('extraction de palette', () => {
  it('retrouve des aplats et leurs proportions', () => {
    const regions: [string, number][] = [
      ['#c0392b', 0.5],
      ['#2e86c1', 0.3],
      ['#f1c40f', 0.2],
    ];
    const palette = extractPalette(flatImage(regions));
    expect(palette).toHaveLength(3);
    regions.forEach(([hex, share], i) => {
      expect(palette[i].hex).toBe(hex);
      expect(palette[i].proportion).toBeCloseTo(share, 2);
    });
  });

  it('résiste au bruit : centres proches des couleurs d’origine', () => {
    const regions: [string, number][] = [
      ['#2d5016', 0.6],
      ['#d4a373', 0.25],
      ['#6b2737', 0.15],
    ];
    const palette = extractPalette(addNoise(flatImage(regions, 40000), 12));
    expect(palette.length).toBeGreaterThanOrEqual(3);
    expect(palette.length).toBeLessThanOrEqual(8);
    regions.forEach(([hex, share]) => {
      const near = palette.filter((c) => labDistance(c.lab, lab(hex)) < 0.05);
      expect(near.length).toBeGreaterThan(0);
      const total = near.reduce((s, c) => s + c.proportion, 0);
      expect(total).toBeCloseTo(share, 1);
    });
  });

  it('fusionne les nuances trop proches', () => {
    const palette = extractPalette(flatImage([
      ['#808080', 0.5],
      ['#828282', 0.5],
    ]));
    expect(palette).toHaveLength(1);
  });

  it('plafonne le nombre de couleurs', () => {
    const regions: [string, number][] = Array.from({ length: 12 }, (_, i) => {
      const hex = '#' + [i * 20, 255 - i * 20, (i * 70) % 256].map((v) => v.toString(16).padStart(2, '0')).join('');
      return [hex, 1 / 12];
    });
    expect(extractPalette(flatImage(regions), { maxColors: 6 }).length).toBeLessThanOrEqual(6);
  });

  it('ignore les pixels transparents', () => {
    const data = flatImage([['#ff0000', 0.5], ['#0000ff', 0.5]]);
    for (let i = 0; i < data.length / 2; i += 4) data[i + 3] = 0;
    const palette = extractPalette(data);
    expect(palette).toHaveLength(1);
    expect(palette[0].hex).toBe('#0000ff');
  });

  it('est déterministe', () => {
    const data = addNoise(flatImage([['#336699', 0.5], ['#996633', 0.5]]), 30);
    expect(extractPalette(data)).toEqual(extractPalette(data));
  });

  it('pipette : hex exact du pixel', () => {
    const c = pickColor(18, 52, 86);
    expect(c.hex).toBe('#123456');
    expect(c.lch.h).toBeCloseTo(hexToLch('#123456').h, 6);
  });

  it('reste rapide sur une image de 800 x 600', () => {
    const data = addNoise(flatImage([['#336699', 0.4], ['#996633', 0.3], ['#eeeeee', 0.3]], 800 * 600), 40);
    const t0 = performance.now();
    extractPalette(data);
    expect(performance.now() - t0).toBeLessThan(1000);
  });
});
