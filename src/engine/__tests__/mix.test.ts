import { describe, expect, it } from 'vitest';
import { labDistance, rgb8ToOklab } from '../color';
import { mixSteps } from '../mix';

describe('transition entre deux couleurs', () => {
  const red = rgb8ToOklab(200, 30, 20);
  const blue = rgb8ToOklab(20, 60, 180);

  it('garde les deux couleurs aux extrémités', () => {
    const steps = mixSteps(red, blue, 5);
    expect(steps).toHaveLength(5);
    expect(steps.map((s) => s.t)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(steps[0].hex).toBe('#c81e14');
    expect(steps[4].hex).toBe('#143cb4');
  });

  it('donne des écarts réguliers dans OKLab', () => {
    const steps = mixSteps(red, blue, 7);
    const gaps = steps.slice(1).map((s, i) => labDistance(s.lab, steps[i].lab));
    for (const g of gaps) expect(g).toBeCloseTo(gaps[0], 6);
  });

  it('accepte au moins deux nuances', () => {
    expect(mixSteps(red, blue, 1)).toHaveLength(2);
  });
});
