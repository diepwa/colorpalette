import { analyzeHarmony, type PaletteColor } from '../engine';
import { fr } from '../i18n/fr';
import type { ImageCard } from '../types';

type Exportable = Pick<ImageCard, 'name' | 'palette' | 'pinned'>;

const round = (n: number, d: number) => Number(n.toFixed(d));
const oklchCss = (c: PaletteColor) => `oklch(${round(c.lch.L, 3)} ${round(c.lch.C, 3)} ${round(c.lch.h, 1)})`;
const pct = (p: number) => `${(p * 100).toFixed(1)} %`;

/** Nom de fichier sans extension ni caractères gênants. */
export function baseName(name: string): string {
  const stem = name.replace(/\.[^.]+$/, '').trim();
  return stem.replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '') || 'palette';
}

/** Harmonie la plus proche, ou null si l'image est surtout neutre. */
function closestHarmony(card: Exportable) {
  const analysis = analyzeHarmony(card.palette);
  return { analysis, best: analysis.reliable ? analysis.ranking[0] : undefined };
}

/** Palette en texte, une couleur par ligne, prête à coller. */
export function paletteText(card: Exportable): string {
  const line = (c: PaletteColor, extra: string) => `${c.hex}  ${oklchCss(c)}  ${extra}`.trimEnd();
  const lines = card.palette.map((c) => line(c, `${pct(c.proportion)}${c.accent ? `  ${fr.accent}` : ''}`));
  if (card.pinned.length > 0) {
    lines.push('', `${fr.pinnedTitle} :`, ...card.pinned.map((c) => line(c, '')));
  }
  return lines.join('\n');
}

const colorJson = (c: PaletteColor) => ({
  hex: c.hex,
  oklch: { l: round(c.lch.L, 4), c: round(c.lch.C, 4), h: round(c.lch.h, 2) },
  proportion: round(c.proportion, 4),
  ...(c.accent ? { accent: true } : {}),
});

/** Export JSON complet : palette, couleurs épinglées et classement des harmonies. */
export function paletteJson(card: Exportable, exportedAt = new Date()): string {
  const { analysis, best } = closestHarmony(card);
  return JSON.stringify(
    {
      name: card.name,
      exportedAt: exportedAt.toISOString(),
      wheel: 'rgb',
      palette: card.palette.map(colorJson),
      pinned: card.pinned.map(colorJson),
      harmony: {
        reliable: analysis.reliable,
        chromaticShare: round(analysis.chromaticShare, 3),
        closest: best?.type ?? null,
        ranking: analysis.ranking.map((r) => ({
          type: r.type,
          score: round(r.score, 3),
          coverage: round(r.coverage, 3),
          referenceHue: round(r.referenceHue, 1),
        })),
      },
    },
    null,
    2,
  );
}

const CARD_W = 1080;
const PAD = 64;

/** Carte palette en PNG : l'image, les couleurs avec leurs hex et l'harmonie la plus proche. */
export async function paletteCardPng(card: Exportable & { blob?: Blob; url: string }): Promise<Blob> {
  const source = card.blob ?? (await (await fetch(card.url)).blob());
  const img = await createImageBitmap(source);
  const { best } = closestHarmony(card);
  const colors = [...card.palette, ...card.pinned];

  const imgW = CARD_W - PAD * 2;
  const imgH = Math.round(Math.min(imgW * 0.75, (imgW * img.height) / img.width));
  const cols = Math.min(4, Math.max(1, colors.length));
  const gap = 20;
  const chipW = (imgW - gap * (cols - 1)) / cols;
  const chipH = 120;
  const rowH = chipH + 96;
  const rows = Math.ceil(colors.length / cols);
  const height = PAD + 70 + imgH + 48 + rows * rowH + 60 + PAD;

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');

  ctx.fillStyle = '#1e1e1e';
  ctx.fillRect(0, 0, CARD_W, height);
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = '#e6e6e6';
  ctx.font = '600 40px system-ui, sans-serif';
  ctx.fillText(fitText(ctx, card.name, imgW), PAD, PAD + 40);

  // Image recadrée au centre (object-fit: cover).
  const scale = Math.max(imgW / img.width, imgH / img.height);
  const sw = imgW / scale;
  const sh = imgH / scale;
  ctx.save();
  roundRect(ctx, PAD, PAD + 70, imgW, imgH, 24);
  ctx.clip();
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, PAD, PAD + 70, imgW, imgH);
  ctx.restore();
  img.close();

  const top = PAD + 70 + imgH + 48;
  colors.forEach((c, i) => {
    const x = PAD + (i % cols) * (chipW + gap);
    const y = top + Math.floor(i / cols) * rowH;
    ctx.fillStyle = c.hex;
    roundRect(ctx, x, y, chipW, chipH, 14);
    ctx.fill();
    ctx.fillStyle = '#e6e6e6';
    ctx.font = '500 30px ui-monospace, Consolas, monospace';
    ctx.fillText(c.hex, x, y + chipH + 38);
    const pinned = i >= card.palette.length;
    const meta = pinned ? fr.pinnedTitle.toLowerCase() : c.accent ? fr.accent : pct(c.proportion);
    ctx.fillStyle = '#a0a0a0';
    ctx.font = '24px ui-monospace, Consolas, monospace';
    ctx.fillText(meta, x, y + chipH + 66);
  });

  ctx.fillStyle = '#a0a0a0';
  ctx.font = '28px system-ui, sans-serif';
  const verdict = best ? `${fr.closest} ${fr.harmonies[best.type]} · ${best.score.toFixed(2).replace('.', ',')}` : fr.unreliable;
  ctx.fillText(fitText(ctx, verdict, imgW), PAD, height - PAD);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encodage PNG impossible'))), 'image/png'),
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fitText(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t}…`;
}

/** Fait télécharger un fichier généré dans le navigateur. */
export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
