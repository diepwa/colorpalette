import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { pickColor } from '../engine';
import { createIndexedDbStore, type SavedImage } from './store';

const image = (id: string, savedAt: number): SavedImage => ({
  id,
  name: `${id}.jpg`,
  savedAt,
  blob: new Blob(['x'], { type: 'image/jpeg' }),
  palette: [{ ...pickColor(200, 20, 20), proportion: 0.4 }],
  pinned: [pickColor(10, 120, 30)],
});

describe('stockage local des images', () => {
  it('enregistre, liste (plus récentes d’abord) et supprime', async () => {
    const store = createIndexedDbStore(new IDBFactory());
    await store.put(image('a', 1));
    await store.put(image('b', 2));
    const listed = await store.list();
    expect(listed.map((i) => i.id)).toEqual(['b', 'a']);
    expect(listed[0].palette[0].hex).toBe('#c81414');
    expect(listed[0].pinned[0].hex).toBe('#0a781e');
    await store.remove('b');
    expect((await store.list()).map((i) => i.id)).toEqual(['a']);
  });

  it('met à jour une image déjà enregistrée', async () => {
    const store = createIndexedDbStore(new IDBFactory());
    await store.put(image('a', 1));
    await store.put({ ...image('a', 1), pinned: [] });
    const [only] = await store.list();
    expect(only.pinned).toHaveLength(0);
  });
});
