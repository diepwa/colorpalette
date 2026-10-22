import { describe, expect, it } from 'vitest';
import { hexToLch, hueDistance } from '../color';
import { generateHarmony } from '../harmonies';
import { hueToWheel, wheelToHue } from '../wheel';

const RED = hexToLch('#ff0000').h; // ~29
const ORANGE = hexToLch('#ff8000').h; // ~53
const YELLOW = hexToLch('#ffff00').h; // ~110
const GREEN = hexToLch('#00ff00').h; // ~142
const BLUE = hexToLch('#0000ff').h; // ~264
const VIOLET = 305;

function complementHue(h: number, wheel: 'ryb' | 'rgb'): number {
  return generateHarmony({ L: 0.6, C: 0.1, h }, 'complementary', { wheel })[1].lch.h;
}

describe('roue RJB', () => {
  it('rouge <-> vert', () => {
    expect(hueDistance(complementHue(RED, 'ryb'), GREEN)).toBeLessThan(5);
    expect(hueDistance(complementHue(GREEN, 'ryb'), RED)).toBeLessThan(5);
  });
  it('bleu <-> orange', () => {
    expect(hueDistance(complementHue(BLUE, 'ryb'), ORANGE)).toBeLessThan(5);
    expect(hueDistance(complementHue(ORANGE, 'ryb'), BLUE)).toBeLessThan(5);
  });
  it('jaune <-> violet', () => {
    expect(hueDistance(complementHue(YELLOW, 'ryb'), VIOLET)).toBeLessThan(5);
    expect(hueDistance(complementHue(VIOLET, 'ryb'), YELLOW)).toBeLessThan(5);
  });
  it('est une bijection (aller-retour)', () => {
    for (let h = 0; h < 360; h += 7) {
      expect(hueDistance(wheelToHue(hueToWheel(h, 'ryb'), 'ryb'), h)).toBeLessThan(1e-9);
    }
  });
  it('est croissante sur tout le tour', () => {
    let prev = hueToWheel(RED, 'ryb');
    let total = 0;
    for (let h = RED + 1; h <= RED + 360; h += 1) {
      const a = hueToWheel(h, 'ryb');
      const step = (a - prev + 360) % 360;
      expect(step).toBeGreaterThan(0);
      expect(step).toBeLessThan(10);
      total += step;
      prev = a;
    }
    expect(total).toBeCloseTo(360, 6);
  });
});

describe('roue RVB', () => {
  it('le complémentaire du rouge est le cyan', () => {
    const cyan = hexToLch('#00ffff').h;
    expect(hueDistance(complementHue(RED, 'rgb'), cyan)).toBeLessThan(15);
  });
});
