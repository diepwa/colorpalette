import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { pickColor } from '../engine';
import { createIndexedDbStore, normalizeSaved, type SavedImage } from './store';
import { picked } from './testColors';

const image = (id: string, savedAt: number): SavedImage => ({
  id,
  name: `${id}.jpg`,
  savedAt,
  blob: new Blob(['x'], { type: 'image/jpeg' }),
  categories: [{ id: 'face', name: 'Visage' }],
  colors: [picked('1', '#c81414', 'face', { x: 0.5, y: 0.5 })],
});

describe('stockage local des images', () => {
  it('enregistre, liste (plus récentes d’abord) et supprime', async () => {
    const store = createIndexedDbStore(new IDBFactory());
    await store.put(image('a', 1));
    await store.put(image('b', 2));
    const listed = await store.list();
    expect(listed.map((i) => i.id)).toEqual(['b', 'a']);
    expect(listed[0].categories[0].name).toBe('Visage');
    expect(listed[0].colors[0]).toMatchObject({ hex: '#c81414', categoryId: 'face', at: { x: 0.5, y: 0.5 } });
    await store.remove('b');
    expect((await store.list()).map((i) => i.id)).toEqual(['a']);
  });

  it('met à jour une image déjà enregistrée', async () => {
    const store = createIndexedDbStore(new IDBFactory());
    await store.put(image('a', 1));
    await store.put({ ...image('a', 1), colors: [] });
    const [only] = await store.list();
    expect(only.colors).toHaveLength(0);
  });

  it('reprend les enregistrements de la première version dans des catégories', () => {
    const legacy = {
      id: 'old',
      name: 'old.jpg',
      savedAt: 1,
      blob: new Blob(['x']),
      palette: [{ ...pickColor(200, 20, 20), proportion: 0.4 }],
      pinned: [pickColor(10, 120, 30)],
    };
    const image = normalizeSaved(legacy as unknown as SavedImage);
    expect(image.categories.map((c) => c.name)).toEqual(['Palette auto', 'Épinglées']);
    expect(image.colors.map((c) => [c.hex, c.categoryId])).toEqual([
      ['#c81414', image.categories[0].id],
      ['#0a781e', image.categories[1].id],
    ]);
    expect(image.colors[0].at).toBeUndefined();
  });
});
