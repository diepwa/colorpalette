import { labDistance, labToLch, lchToHex, rgb8ToOklab, type Lab, type Lch } from './color';

export interface PaletteColor {
  hex: string;
  lab: Lab;
  lch: Lch;
  /** Part des pixels de l'image, dans [0, 1]. */
  proportion: number;
  /** Couleur vive et rare, gardée même sous le seuil de proportion. */
  accent?: boolean;
}

export interface ExtractOptions {
  /** Nombre de clusters de départ, avant fusion. */
  clusters?: number;
  /** Nombre maximal de couleurs renvoyées. */
  maxColors?: number;
  /** Distance OKLab sous laquelle deux couleurs sont fusionnées. */
  mergeDistance?: number;
  /** Proportion sous laquelle une couleur est écartée. */
  minProportion?: number;
  /** Nombre maximal de pixels échantillonnés pour le k-means. */
  maxSamples?: number;
  iterations?: number;
  seed?: number;
  /** Chroma OKLCH minimal d'un pixel pour être candidat accent. */
  accentMinChroma?: number;
  /** Distance OKLab minimale entre un accent et toute couleur dominante. */
  accentDistance?: number;
  /** Proportion minimale d'un accent (0,03 % par défaut). */
  accentMinProportion?: number;
  /** Nombre maximal d'accents renvoyés, en plus des couleurs dominantes. */
  maxAccents?: number;
  /** Nombre maximal de pixels parcourus pour chercher les accents. */
  accentSamples?: number;
}

const DEFAULTS: Required<ExtractOptions> = {
  clusters: 12,
  maxColors: 8,
  mergeDistance: 0.06,
  minProportion: 0.01,
  maxSamples: 20000,
  iterations: 20,
  seed: 1,
  accentMinChroma: 0.1,
  accentDistance: 0.15,
  accentMinProportion: 0.0003,
  maxAccents: 3,
  accentSamples: 200000,
};

/** Générateur pseudo-aléatoire déterministe (mulberry32), pour des résultats reproductibles. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pixels RGBA (ImageData.data) vers un échantillon de points OKLab ; ignore les pixels transparents. */
function samplePixels(data: Uint8ClampedArray, maxSamples: number): Float64Array {
  const pixelCount = data.length / 4;
  const stride = Math.max(1, Math.floor(pixelCount / maxSamples));
  const out: number[] = [];
  for (let i = 0; i < pixelCount; i += stride) {
    const o = i * 4;
    if (data[o + 3] < 128) continue;
    const { L, a, b } = rgb8ToOklab(data[o], data[o + 1], data[o + 2]);
    out.push(L, a, b);
  }
  return Float64Array.from(out);
}

function sqDist(points: Float64Array, i: number, c: Float64Array, j: number): number {
  const dL = points[i * 3] - c[j * 3];
  const da = points[i * 3 + 1] - c[j * 3 + 1];
  const db = points[i * 3 + 2] - c[j * 3 + 2];
  return dL * dL + da * da + db * db;
}

/** k-means++ puis itérations de Lloyd ; renvoie les centres et le nombre de points par centre. */
function kmeans(points: Float64Array, k: number, iterations: number, rand: () => number) {
  const n = points.length / 3;
  k = Math.min(k, n);
  const centers = new Float64Array(k * 3);
  const minD = new Float64Array(n).fill(Infinity);

  let first = Math.floor(rand() * n);
  for (let c = 0; c < k; c++) {
    centers.set(points.subarray(first * 3, first * 3 + 3), c * 3);
    let total = 0;
    for (let i = 0; i < n; i++) {
      minD[i] = Math.min(minD[i], sqDist(points, i, centers, c));
      total += minD[i];
    }
    if (total === 0) {
      // Moins de couleurs distinctes que de clusters demandés.
      k = c + 1;
      break;
    }
    let r = rand() * total;
    first = n - 1;
    for (let i = 0; i < n; i++) {
      r -= minD[i];
      if (r <= 0) {
        first = i;
        break;
      }
    }
  }

  const assign = new Int32Array(n);
  const counts = new Float64Array(k);
  for (let it = 0; it < iterations; it++) {
    let changed = false;
    for (let i = 0; i < n; i++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const d = sqDist(points, i, centers, c);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (assign[i] !== best || it === 0) changed = true;
      assign[i] = best;
    }
    const sums = new Float64Array(k * 3);
    counts.fill(0);
    for (let i = 0; i < n; i++) {
      const c = assign[i];
      counts[c]++;
      sums[c * 3] += points[i * 3];
      sums[c * 3 + 1] += points[i * 3 + 1];
      sums[c * 3 + 2] += points[i * 3 + 2];
    }
    for (let c = 0; c < k; c++) {
      if (counts[c] === 0) continue;
      centers[c * 3] = sums[c * 3] / counts[c];
      centers[c * 3 + 1] = sums[c * 3 + 1] / counts[c];
      centers[c * 3 + 2] = sums[c * 3 + 2] / counts[c];
    }
    if (!changed) break;
  }

  const result: { lab: Lab; count: number }[] = [];
  for (let c = 0; c < k; c++) {
    if (counts[c] > 0) {
      result.push({ lab: { L: centers[c * 3], a: centers[c * 3 + 1], b: centers[c * 3 + 2] }, count: counts[c] });
    }
  }
  return result;
}

/** Fusionne itérativement les deux clusters les plus proches tant qu'ils sont sous le seuil. */
function mergeClose(clusters: { lab: Lab; count: number }[], threshold: number) {
  const list = clusters.map((c) => ({ ...c }));
  for (;;) {
    let bi = -1;
    let bj = -1;
    let bestD = threshold;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const d = labDistance(list[i].lab, list[j].lab);
        if (d < bestD) {
          bestD = d;
          bi = i;
          bj = j;
        }
      }
    }
    if (bi < 0) return list;
    const p = list[bi];
    const q = list[bj];
    const count = p.count + q.count;
    p.lab = {
      L: (p.lab.L * p.count + q.lab.L * q.count) / count,
      a: (p.lab.a * p.count + q.lab.a * q.count) / count,
      b: (p.lab.b * p.count + q.lab.b * q.count) / count,
    };
    p.count = count;
    list.splice(bj, 1);
  }
}

/**
 * Cherche les couleurs vives et rares que le k-means noie : pixels saturés et loin
 * de toutes les couleurs dominantes (ex. une jupe rouge dans un champ vert).
 * L'échantillon est plus dense que celui du k-means pour ne pas rater de petites zones.
 */
function findAccents(data: Uint8ClampedArray, dominants: Lab[], opts: Required<ExtractOptions>, rand: () => number) {
  const pixelCount = data.length / 4;
  const stride = Math.max(1, Math.floor(pixelCount / opts.accentSamples));
  const candidates: number[] = [];
  let total = 0;
  for (let i = 0; i < pixelCount; i += stride) {
    const o = i * 4;
    if (data[o + 3] < 128) continue;
    total++;
    const lab = rgb8ToOklab(data[o], data[o + 1], data[o + 2]);
    if (Math.hypot(lab.a, lab.b) < opts.accentMinChroma) continue;
    if (dominants.some((d) => labDistance(d, lab) < opts.accentDistance)) continue;
    candidates.push(lab.L, lab.a, lab.b);
  }
  const n = candidates.length / 3;
  if (total === 0 || n / total < opts.accentMinProportion) return [];

  const clusters = kmeans(Float64Array.from(candidates), opts.maxAccents + 2, opts.iterations, rand);
  return mergeClose(clusters, opts.mergeDistance * 2)
    .filter((c) => c.count / total >= opts.accentMinProportion)
    .sort((p, q) => q.count - p.count)
    .slice(0, opts.maxAccents)
    .map((c) => ({ lab: c.lab, proportion: c.count / total }));
}

/**
 * Extrait les couleurs dominantes d'une image (pixels RGBA) par k-means dans OKLab.
 * Les proportions sont calculées sur les pixels échantillonnés et triées par ordre décroissant.
 * Les accents éventuels (couleurs vives et rares) sont ajoutés à la fin, marqués `accent`.
 */
export function extractPalette(data: Uint8ClampedArray, options: ExtractOptions = {}): PaletteColor[] {
  const opts = { ...DEFAULTS, ...options };
  const points = samplePixels(data, opts.maxSamples);
  const n = points.length / 3;
  if (n === 0) return [];

  const clusters = kmeans(points, opts.clusters, opts.iterations, mulberry32(opts.seed));
  const merged = mergeClose(clusters, opts.mergeDistance)
    .filter((c) => c.count / n >= opts.minProportion)
    .sort((p, q) => q.count - p.count)
    .slice(0, opts.maxColors);

  const dominants: PaletteColor[] = merged.map(({ lab, count }) => {
    const lch = labToLch(lab);
    return { hex: lchToHex(lch), lab, lch, proportion: count / n };
  });
  const accents: PaletteColor[] = findAccents(data, merged.map((c) => c.lab), opts, mulberry32(opts.seed + 1)).map(
    ({ lab, proportion }) => {
      const lch = labToLch(lab);
      return { hex: lchToHex(lch), lab, lch, proportion, accent: true };
    },
  );
  return [...dominants, ...accents];
}

/** Couleur d'un pixel précis (pipette). */
export function pickColor(r: number, g: number, b: number): PaletteColor {
  const lab = rgb8ToOklab(r, g, b);
  const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  return { hex, lab, lch: labToLch(lab), proportion: 0 };
}
