import { hueDistance, normalizeHue, type Lch } from './color';
import { DEFAULT_ANALOGOUS_WIDTH, HARMONY_TYPES, harmonyOffsets, type HarmonyType } from './harmonies';
import { hueToWheel, wheelToHue, type Wheel } from './wheel';

export interface AnalysisInput {
  hex: string;
  lch: Lch;
  proportion: number;
  accent?: boolean;
}

export interface AnalysisOptions {
  wheel?: Wheel;
  /** Chroma OKLCH sous lequel une couleur est jugée neutre (teinte non fiable). */
  chromaThreshold?: number;
  /** Écart angulaire toléré autour de chaque teinte cible, en degrés. */
  tolerance?: number;
  /** Pas de rotation du gabarit, en degrés. */
  step?: number;
  /** Part minimale du poids pour qu'une teinte cible compte comme présente. */
  coverageMinShare?: number;
  /** Part chromatique minimale de l'image pour rendre un verdict. */
  minChromaticShare?: number;
  analogousWidth?: number;
  /** Écart de score sous lequel l'harmonie la plus simple passe devant. */
  tieMargin?: number;
  /**
   * Poids plancher d'un accent, en part de la surface chromatique : une petite tache
   * vive attire l'œil bien plus que sa surface ne le dit.
   */
  accentShare?: number;
}

export const DEFAULT_ANALYSIS_OPTIONS: Required<AnalysisOptions> = {
  wheel: 'rgb',
  chromaThreshold: 0.04,
  tolerance: 15,
  step: 1,
  coverageMinShare: 0.05,
  minChromaticShare: 0.1,
  accentShare: 0.1,
  analogousWidth: DEFAULT_ANALOGOUS_WIDTH,
  tieMargin: 0.05,
};

export interface HarmonyScore {
  type: HarmonyType;
  score: number;
  fit: number;
  baseline: number;
  coverage: number;
  /** Rotation optimale du gabarit : angle de la teinte de référence sur la roue. */
  rotation: number;
  /** Teinte OKLCH correspondant à la rotation optimale. */
  referenceHue: number;
  /** Angles cibles du gabarit sur la roue. */
  targets: number[];
  /** Couleurs chromatiques hors de la tolérance de toute cible. */
  outliers: AnalysisInput[];
}

export interface AnalysisResult {
  /** false si l'image est trop neutre pour un verdict fiable. */
  reliable: boolean;
  chromaticShare: number;
  ranking: HarmonyScore[];
  /** Couleurs écartées car trop peu saturées. */
  neutrals: AnalysisInput[];
  /** Couleurs retenues, avec leur angle sur la roue et leur poids normalisé. */
  points: { color: AnalysisInput; angle: number; weight: number }[];
}

interface WeightedPoint {
  color: AnalysisInput;
  angle: number;
  weight: number;
}

function scoreTemplate(
  points: WeightedPoint[],
  offsets: number[],
  rotation: number,
  opts: Required<AnalysisOptions>,
) {
  const targets = offsets.map((o) => normalizeHue(rotation + o));
  const shares = new Array<number>(targets.length).fill(0);
  let fit = 0;
  for (const p of points) {
    let best = 0;
    let bestD = Infinity;
    targets.forEach((t, k) => {
      const d = hueDistance(p.angle, t);
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    });
    if (bestD <= opts.tolerance) {
      fit += p.weight * (1 - bestD / opts.tolerance);
      shares[best] += p.weight;
    }
  }
  const coverage = shares.filter((s) => s >= opts.coverageMinShare).length / targets.length;
  return { fit, coverage, targets };
}

/** À score quasi égal, fait passer devant le gabarit qui a le moins de points. */
function preferSimpler(ranking: HarmonyScore[], margin: number) {
  for (let i = 1; i < ranking.length; i++) {
    for (let j = i; j > 0; j--) {
      const prev = ranking[j - 1];
      const cur = ranking[j];
      if (prev.score - cur.score < margin && cur.targets.length < prev.targets.length) {
        ranking[j - 1] = cur;
        ranking[j] = prev;
      } else break;
    }
  }
}

/**
 * Indique de quelle harmonie la palette se rapproche le plus.
 * score = max(0, (ajustement − b) / (1 − b)) × couverture, où b = n × tolérance / 360
 * est l'ajustement qu'obtiendraient des teintes au hasard avec un gabarit à n points.
 */
export function analyzeHarmony(colors: AnalysisInput[], options: AnalysisOptions = {}): AnalysisResult {
  const opts = { ...DEFAULT_ANALYSIS_OPTIONS, ...options };

  const chromatic = colors.filter((c) => c.lch.C >= opts.chromaThreshold);
  const neutrals = colors.filter((c) => c.lch.C < opts.chromaThreshold);
  const totalShare = colors.reduce((s, c) => s + c.proportion, 0);
  const chromaticShare = totalShare > 0 ? chromatic.reduce((s, c) => s + c.proportion, 0) / totalShare : 0;

  const chromaticProportion = chromatic.reduce((s, c) => s + c.proportion, 0);
  const rawWeights = chromatic.map((c) => {
    const share = c.accent ? Math.max(c.proportion, opts.accentShare * chromaticProportion) : c.proportion;
    return share * c.lch.C;
  });
  const weightSum = rawWeights.reduce((s, w) => s + w, 0);
  const points: WeightedPoint[] = chromatic.map((color, i) => ({
    color,
    angle: hueToWheel(color.lch.h, opts.wheel),
    weight: weightSum > 0 ? rawWeights[i] / weightSum : 0,
  }));

  const ranking: HarmonyScore[] = [];
  if (points.length > 0) {
    for (const type of HARMONY_TYPES) {
      const offsets = harmonyOffsets(type, opts.analogousWidth);
      const baseline = Math.min(0.95, (offsets.length * opts.tolerance) / 360);
      let best: HarmonyScore | null = null;
      for (let rotation = 0; rotation < 360; rotation += opts.step) {
        const { fit, coverage, targets } = scoreTemplate(points, offsets, rotation, opts);
        const score = Math.max(0, (fit - baseline) / (1 - baseline)) * coverage;
        if (!best || score > best.score + 1e-9) {
          best = { type, score, fit, baseline, coverage, rotation, referenceHue: 0, targets, outliers: [] };
        }
      }
      if (best) {
        const winner = best;
        winner.referenceHue = wheelToHue(winner.rotation, opts.wheel);
        winner.outliers = points
          .filter((p) => Math.min(...winner.targets.map((t) => hueDistance(p.angle, t))) > opts.tolerance)
          .map((p) => p.color);
        ranking.push(winner);
      }
    }
    ranking.sort((p, q) => q.score - p.score);
    preferSimpler(ranking, opts.tieMargin);
  }

  return {
    reliable: points.length > 0 && chromaticShare >= opts.minChromaticShare,
    chromaticShare,
    ranking,
    neutrals,
    points,
  };
}
