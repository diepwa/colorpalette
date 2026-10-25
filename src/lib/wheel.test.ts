import { describe, expect, it } from 'vitest';
import { RINGS, discColor, wheelPosition } from './wheel';

const hex = ([r, g, b]: number[]) => '#' + [r, g, b].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');

describe('place des couleurs sur la roue des nuances', () => {
  it('met le jaune en haut, le rouge à droite et le bleu en bas', () => {
    expect(wheelPosition('#ffff00').angle).toBeCloseTo(0);
    expect(wheelPosition('#ff0000').angle).toBeCloseTo(60);
    expect(wheelPosition('#0000ff').angle).toBeCloseTo(180);
  });

  it('pose les pigments purs sur leur anneau, les foncés vers le centre, les pâles au bord', () => {
    const pure = wheelPosition('#ff0000').radius;
    expect(pure).toBeGreaterThan(RINGS.pure);
    expect(pure).toBeLessThan(RINGS.shadeEnd);
    expect(wheelPosition('#600000').radius).toBeLessThan(pure);
    expect(wheelPosition('#ffb0b0').radius).toBeGreaterThan(RINGS.shadeEnd);
  });

  it('envoie les gris au centre', () => {
    expect(wheelPosition('#808080').radius).toBeLessThan(RINGS.black);
  });

  it('donne à #4e4243 une place dans les rouges foncés', () => {
    const { angle, radius } = wheelPosition('#4e4243');
    expect(angle).toBeGreaterThan(50);
    expect(angle).toBeLessThan(80);
    expect(radius).toBeGreaterThan(RINGS.pure);
    expect(radius).toBeLessThan(0.5);
  });

  it('range les nuances foncées dans l’ordre', () => {
    const r = ['#4e4243', '#7a3f45', '#b01e2a'].map((h) => wheelPosition(h).radius);
    expect(r[0]).toBeLessThan(r[1]);
    expect(r[1]).toBeLessThan(r[2]);
  });

  it('pose une couleur du disque sur la case de cette couleur', () => {
    for (const [r, angle] of [[0.5, 100], [0.7, 200], [0.9, 300], [0.3, 30]]) {
      const c = discColor(r, angle)!;
      const p = wheelPosition(hex(c));
      expect(hex(discColor(p.radius, p.angle)!)).toBe(hex(c));
    }
  });
});
