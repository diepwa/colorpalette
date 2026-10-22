import { describe, expect, it } from 'vitest';
import { hexToLch, lchToHex, type Lch } from '../color';
import { analyzeHarmony, type AnalysisInput } from '../analysis';
import { extractPalette } from '../extract';
import { wheelToHue } from '../wheel';
import { flatImage } from './helpers';

const color = (lch: Lch, proportion: number): AnalysisInput => ({ hex: lchToHex(lch), lch, proportion });
/** Couleur placée à un angle donné de la roue (RVB par défaut). */
const at = (angle: number, proportion: number, L = 0.6, C = 0.14, wheel: 'rgb' | 'ryb' = 'rgb') =>
  color({ L, C, h: wheelToHue(angle, wheel) }, proportion);

describe('analyse d’harmonie', () => {
  it('deux aplats complémentaires -> complémentaire, score élevé', () => {
    const red = lchToHex({ L: 0.55, C: 0.18, h: 30 });
    const teal = lchToHex({ L: 0.6, C: 0.11, h: 210 });
    const palette = extractPalette(flatImage([[red, 0.55], [teal, 0.45]]));
    const result = analyzeHarmony(palette);
    expect(result.reliable).toBe(true);
    expect(result.ranking[0].type).toBe('complementary');
    expect(result.ranking[0].score).toBeGreaterThan(0.8);
  });

  it('image quasi monochrome -> monochrome ou analogue', () => {
    const base = hexToLch('#2e6fb0');
    const palette = [
      color({ ...base, L: 0.35 }, 0.3),
      color(base, 0.3),
      color({ ...base, L: 0.75, h: base.h + 5 }, 0.25),
      color({ ...base, L: 0.9, C: 0.05, h: base.h - 4 }, 0.15),
    ];
    const result = analyzeHarmony(palette);
    expect(['monochrome', 'analogous']).toContain(result.ranking[0].type);
    expect(result.ranking[0].score).toBeGreaterThan(0.8);
  });

  it('le tétradique ne gagne pas par défaut', () => {
    const cases = [
      [at(0, 0.5), at(180, 0.5)],
      [at(40, 0.4), at(160, 0.3), at(280, 0.3)],
      [at(100, 1)],
    ];
    for (const palette of cases) {
      expect(['tetradic', 'square']).not.toContain(analyzeHarmony(palette).ranking[0].type);
    }
  });

  it('reconnaît chaque gabarit construit sur la roue', () => {
    const expectations: [string, number[]][] = [
      ['complementary', [0, 180]],
      ['splitComplementary', [0, 150, 210]],
      ['triadic', [0, 120, 240]],
      ['tetradic', [0, 60, 180, 240]],
      ['square', [0, 90, 180, 270]],
      ['analogous', [0, 30, -30]],
    ];
    for (const [type, offsets] of expectations) {
      const palette = offsets.map((o) => at(70 + o, 1 / offsets.length));
      const result = analyzeHarmony(palette);
      expect(result.ranking[0].type, type).toBe(type);
    }
  });

  it('trouve la rotation optimale et les couleurs hors schéma', () => {
    const palette = [at(20, 0.45), at(200, 0.45), at(110, 0.1)];
    const result = analyzeHarmony(palette);
    const top = result.ranking[0];
    expect(top.type).toBe('complementary');
    expect(Math.min(Math.abs(top.rotation - 20), Math.abs(top.rotation - 200))).toBeLessThanOrEqual(1);
    expect(top.outliers.map((c) => c.hex)).toEqual([palette[2].hex]);
  });

  it('un accent rare pèse plus que sa surface', () => {
    const greens = [at(178, 0.5, 0.4, 0.08), at(182, 0.45, 0.55, 0.08)];
    const red = { ...at(0, 0.002, 0.45, 0.17), accent: true };
    const plain = analyzeHarmony([...greens, { ...red, accent: false }]);
    const withAccent = analyzeHarmony([...greens, red]);
    expect(plain.ranking[0].type).toBe('monochrome');
    const comp = withAccent.ranking.find((r) => r.type === 'complementary')!;
    expect(comp.coverage).toBe(1);
    expect(comp.score).toBeGreaterThan(plain.ranking.find((r) => r.type === 'complementary')!.score);
  });

  it('ignore les neutres et refuse le verdict sur une image grise', () => {
    const palette = [
      color({ L: 0.2, C: 0.01, h: 40 }, 0.5),
      color({ L: 0.8, C: 0.02, h: 250 }, 0.45),
      color({ L: 0.6, C: 0.12, h: 30 }, 0.05),
    ];
    const result = analyzeHarmony(palette);
    expect(result.neutrals).toHaveLength(2);
    expect(result.reliable).toBe(false);
  });

  it('la roue change la lecture : rouge + vert est complémentaire en RJB, pas en RVB', () => {
    const palette = [color(hexToLch('#ff0000'), 0.5), color(hexToLch('#00c000'), 0.5)];
    const ryb = analyzeHarmony(palette, { wheel: 'ryb' });
    const rgb = analyzeHarmony(palette, { wheel: 'rgb' });
    expect(ryb.ranking[0].type).toBe('complementary');
    const rgbComp = rgb.ranking.find((r) => r.type === 'complementary')!;
    expect(rgbComp.score).toBeLessThan(ryb.ranking[0].score);
  });
});
