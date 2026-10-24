import { describe, expect, it } from 'vitest';
import { baseName, paletteJson, paletteText } from './export';
import { picked } from './testColors';

const card = {
  name: 'chevalier.jpg',
  categories: [
    { id: 'face', name: 'Visage' },
    { id: 'cloth', name: 'Vêtements' },
    { id: 'hair', name: 'Cheveux' },
  ],
  colors: [
    picked('1', '#e0a080', 'face', { x: 0.5, y: 0.2 }),
    picked('2', '#b0120f', 'cloth', { x: 0.4, y: 0.7 }),
    picked('3', '#c08060', 'face', { x: 0.52, y: 0.22 }),
    picked('4', '#2050a0', null),
  ],
};

describe('exports', () => {
  it('nettoie le nom de fichier', () => {
    expect(baseName('champ de blé.jpg')).toBe('champ-de-blé');
    expect(baseName('photo.final.png')).toBe('photo.final');
    expect(baseName('***.webp')).toBe('palette');
  });

  it('écrit les couleurs par catégorie, sans les catégories vides', () => {
    const text = paletteText(card);
    const blocks = text.split('\n\n').map((b) => b.split('\n'));
    expect(blocks.map((b) => b[0])).toEqual(['Visage :', 'Vêtements :', 'Sans catégorie :']);
    expect(blocks[0].slice(1)).toEqual([
      expect.stringMatching(/^#e0a080 {2}oklch\([\d.]+ [\d.]+ [\d.]+\)$/),
      expect.stringMatching(/^#c08060 /),
    ]);
  });

  it('exporte un JSON relisible avec catégories, positions et harmonies', () => {
    const data = JSON.parse(paletteJson(card, new Date('2026-10-24T12:00:00Z')));
    expect(data.exportedAt).toBe('2026-10-24T12:00:00.000Z');
    expect(data.categories.map((c: { name: string }) => c.name)).toEqual(['Visage', 'Vêtements', 'Sans catégorie']);
    expect(data.categories[0].colors[0]).toMatchObject({ hex: '#e0a080', at: { x: 0.5, y: 0.2 } });
    expect(data.categories[2].colors[0].at).toBeUndefined();
    expect(data.harmony.ranking).toHaveLength(7);
  });
});
