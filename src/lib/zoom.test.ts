import { describe, expect, it } from 'vitest';
import { clampView, zoomAt } from './zoom';

describe('zoom de l’image', () => {
  it('garde fixe le point zoomé', () => {
    const v = zoomAt({ scale: 1, tx: 0, ty: 0 }, 2, 100, 50);
    expect(v).toEqual({ scale: 2, tx: -100, ty: -50 });
    // Le point (100, 50) du cadre montre toujours le même point de l'image.
    expect((100 - v.tx) / v.scale).toBe(100);
  });

  it('borne le zoom et le décalage', () => {
    expect(clampView({ scale: 0.5, tx: 30, ty: 30 }, 200, 100)).toEqual({ scale: 1, tx: 0, ty: 0 });
    expect(clampView({ scale: 20, tx: -5000, ty: 10 }, 200, 100)).toEqual({ scale: 8, tx: -1400, ty: 0 });
  });
});
