import { describe, expect, it } from 'vitest';
import { containRect, pixelAt, pixelCoords, toImagePoint } from './loadImage';

describe('position de la pipette sur une image en contain', () => {
  it('centre une image large dans un cadre haut', () => {
    expect(containRect(400, 800, 200, 100)).toEqual({ x: 0, y: 300, width: 400, height: 200 });
  });

  it('convertit un point du cadre en position sur l’image, null dans les bandes vides', () => {
    const rect = containRect(400, 800, 200, 100);
    expect(toImagePoint(rect, 100, 350)).toEqual({ x: 0.25, y: 0.25 });
    expect(toImagePoint(rect, 100, 100)).toBeNull();
    expect(toImagePoint(rect, 400, 350)).toBeNull();
  });

  it('lit le pixel sous une position', () => {
    const data = new Uint8ClampedArray(2 * 2 * 4);
    data.set([255, 0, 0, 255], 12); // pixel (1, 1)
    const pixels = { width: 2, height: 2, data } as ImageData;
    expect(pixelCoords(pixels, { x: 0.99, y: 0.99 })).toEqual([1, 1]);
    expect(pixelAt(pixels, { x: 0.75, y: 0.6 })).toEqual([255, 0, 0]);
    expect(pixelAt(pixels, { x: 0.1, y: 0.1 })).toEqual([0, 0, 0]);
  });
});
