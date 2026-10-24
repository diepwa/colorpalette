import { describe, expect, it } from 'vitest';
import type { Bytes } from 'firebase/firestore';
import { firebaseConfig } from './firebase';
import { fitUnder, fromDoc, toDoc } from './firestoreStore';
import type { SavedImage } from './store';
import { picked } from './testColors';

const fakeBytes = (data: number[]) => ({ toUint8Array: () => new Uint8Array(data) }) as unknown as Bytes;

describe('stockage Firestore', () => {
  const image: SavedImage = {
    id: 'img1',
    name: 'chevalier.jpg',
    savedAt: 42,
    blob: new Blob(['x']),
    categories: [{ id: 'face', name: 'Visage' }],
    // Couleur reprise d'une ancienne version : sans position (champ absent).
    colors: [picked('1', '#c81414', 'face', { x: 0.5, y: 0.25 }), picked('2', '#0a781e', 'face')],
  };

  it('écrit un document sans champs undefined et le relit à l’identique', async () => {
    const withUndefined = { ...image, colors: [...image.colors, { ...picked('3', '#ffffff', null), at: undefined }] };
    const docData = toDoc(withUndefined, fakeBytes([1, 2, 3]));
    expect(JSON.stringify(docData.colors)).not.toContain('undefined');
    expect('at' in docData.colors[2]).toBe(false);

    const back = fromDoc('img1', docData);
    expect(back).toMatchObject({ id: 'img1', name: 'chevalier.jpg', savedAt: 42, categories: image.categories });
    expect(back.colors.map((c) => c.hex)).toEqual(['#c81414', '#0a781e', '#ffffff']);
    expect(back.colors[0].at).toEqual({ x: 0.5, y: 0.25 });
    expect([...new Uint8Array(await back.blob.arrayBuffer())]).toEqual([1, 2, 3]);
    expect(back.blob.type).toBe('image/jpeg');
  });

  it('réduit l’image jusqu’à passer sous la limite', async () => {
    const tried: [number, number][] = [];
    const blob = await fitUnder(100, async (scale, quality) => {
      tried.push([scale, quality]);
      return new Blob([new Uint8Array(Math.round(400 * scale * scale * quality))]);
    });
    expect(blob.size).toBeLessThanOrEqual(100);
    expect(tried[0]).toEqual([1, 0.88]);
    expect(tried.at(-1)![0]).toBeLessThan(1);
  });

  it('abandonne si l’image reste trop lourde', async () => {
    await expect(fitUnder(10, async () => new Blob([new Uint8Array(1000)]))).rejects.toThrow(/trop lourde/);
  });

  it('lit la configuration Firebase, ou rien si elle est incomplète', () => {
    expect(firebaseConfig({} as ImportMetaEnv)).toBeNull();
    expect(
      firebaseConfig({ VITE_FIREBASE_API_KEY: 'k', VITE_FIREBASE_PROJECT_ID: 'p', VITE_FIREBASE_APP_ID: 'a' } as ImportMetaEnv),
    ).toEqual({ apiKey: 'k', authDomain: 'p.firebaseapp.com', projectId: 'p', appId: 'a' });
  });
});
