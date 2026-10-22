import { describe, expect, it } from 'vitest';
import { hexToLch, type PaletteColor } from '../engine';
import { baseName, paletteJson, paletteText } from './export';

const color = (hex: string, proportion: number, accent = false): PaletteColor => {
  const lch = hexToLch(hex);
  const h = (lch.h * Math.PI) / 180;
  return { hex, lch, lab: { L: lch.L, a: lch.C * Math.cos(h), b: lch.C * Math.sin(h) }, proportion, ...(accent ? { accent } : {}) };
};

const card = {
  name: 'champ de blé.jpg',
  palette: [color('#2f6b2a', 0.6), color('#8fae4b', 0.39), color('#b0120f', 0.01, true)],
  pinned: [color('#d8c27a', 0)],
};

describe('exports', () => {
  it('nettoie le nom de fichier', () => {
    expect(baseName('champ de blé.jpg')).toBe('champ-de-blé');
    expect(baseName('photo.final.png')).toBe('photo.final');
    expect(baseName('***.webp')).toBe('palette');
  });

  it('écrit une couleur par ligne avec hex, oklch et part', () => {
    const lines = paletteText(card).split('\n');
    expect(lines[0]).toMatch(/^#2f6b2a {2}oklch\([\d.]+ [\d.]+ [\d.]+\) {2}60\.0 %$/);
    expect(lines[2]).toContain('accent');
    expect(lines.slice(-2)).toEqual(['Épinglées :', expect.stringMatching(/^#d8c27a {2}oklch\(/)]);
  });

  it('exporte un JSON relisible avec la palette et les harmonies', () => {
    const data = JSON.parse(paletteJson(card, new Date('2026-10-22T12:00:00Z')));
    expect(data.exportedAt).toBe('2026-10-22T12:00:00.000Z');
    expect(data.wheel).toBe('rgb');
    expect(data.palette.map((c: { hex: string }) => c.hex)).toEqual(['#2f6b2a', '#8fae4b', '#b0120f']);
    expect(data.palette[2].accent).toBe(true);
    expect(data.palette[0].accent).toBeUndefined();
    expect(data.pinned).toHaveLength(1);
    expect(data.harmony.ranking).toHaveLength(7);
    expect(data.harmony.closest).toBe(data.harmony.reliable ? data.harmony.ranking[0].type : null);
  });
});
