import { analyzeHarmony } from '../engine';
import { fr } from '../i18n/fr';
import type { ImageCard, PickedColor } from '../types';
import { groupByCategory } from './cards';

type Exportable = Pick<ImageCard, 'name' | 'categories' | 'colors'>;

const round = (n: number, d: number) => Number(n.toFixed(d));
const oklchCss = (c: PickedColor) => `oklch(${round(c.lch.L, 3)} ${round(c.lch.C, 3)} ${round(c.lch.h, 1)})`;
const groupName = (name: string | undefined) => name ?? fr.noCategory;

/** Nom de fichier sans extension ni caractères gênants. */
export function baseName(name: string): string {
  const stem = name.replace(/\.[^.]+$/, '').trim();
  return stem.replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '') || 'palette';
}

/** Harmonie la plus proche des couleurs prélevées (poids égaux), ou undefined si elles sont surtout neutres. */
function closestHarmony(colors: PickedColor[]) {
  const analysis = analyzeHarmony(colors.map((c) => ({ hex: c.hex, lch: c.lch, proportion: 1 / colors.length })));
  return { analysis, best: analysis.reliable ? analysis.ranking[0] : undefined };
}

/** Couleurs en texte, regroupées par catégorie, prêtes à coller. */
export function paletteText(card: Exportable): string {
  return groupByCategory(card)
    .map((g) => [`${groupName(g.category?.name)} :`, ...g.colors.map((c) => `${c.hex}  ${oklchCss(c)}`)].join('\n'))
    .join('\n\n');
}

const colorJson = (c: PickedColor) => ({
  hex: c.hex,
  oklch: { l: round(c.lch.L, 4), c: round(c.lch.C, 4), h: round(c.lch.h, 2) },
  ...(c.at ? { at: { x: round(c.at.x, 4), y: round(c.at.y, 4) } } : {}),
});

/** Export JSON : catégories avec leurs couleurs, et classement des harmonies sur l'ensemble. */
export function paletteJson(card: Exportable, exportedAt = new Date()): string {
  const { analysis, best } = closestHarmony(card.colors);
  return JSON.stringify(
    {
      name: card.name,
      exportedAt: exportedAt.toISOString(),
      wheel: 'rgb',
      categories: groupByCategory(card).map((g) => ({
        name: groupName(g.category?.name),
        colors: g.colors.map(colorJson),
      })),
      harmony: {
        reliable: analysis.reliable,
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
const COLS = 5;
const GAP = 18;
const CHIP_H = 96;
const ROW_H = CHIP_H + 60;
const TITLE_H = 56;

/** Carte en PNG : l'image avec les repères des prélèvements, puis les couleurs par catégorie. */
export async function paletteCardPng(card: Exportable & { blob?: Blob; url: string }): Promise<Blob> {
  const source = card.blob ?? (await (await fetch(card.url)).blob());
  const img = await createImageBitmap(source);
  const groups = groupByCategory(card);
  const { best } = closestHarmony(card.colors);

  const imgW = CARD_W - PAD * 2;
  const imgH = Math.round(Math.min(imgW * 1.1, (imgW * img.height) / img.width));
  const chipW = (imgW - GAP * (COLS - 1)) / COLS;
  const groupsH = groups.reduce((h, g) => h + TITLE_H + Math.ceil(g.colors.length / COLS) * ROW_H, 0);
  const height = PAD + 70 + imgH + 32 + groupsH + 40 + PAD;

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');

  ctx.fillStyle = '#1e1e1e';
  ctx.fillRect(0, 0, CARD_W, height);

  ctx.fillStyle = '#e6e6e6';
  ctx.font = '600 40px system-ui, sans-serif';
  ctx.fillText(fitText(ctx, card.name, imgW), PAD, PAD + 40);

  // Image entière (contain), centrée dans sa zone.
  const scale = Math.min(imgW / img.width, imgH / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x0 = PAD + (imgW - w) / 2;
  const y0 = PAD + 70 + (imgH - h) / 2;
  ctx.save();
  roundRect(ctx, x0, y0, w, h, 20);
  ctx.clip();
  ctx.drawImage(img, x0, y0, w, h);
  ctx.restore();
  img.close();
  for (const c of card.colors) {
    if (!c.at) continue;
    marker(ctx, x0 + c.at.x * w, y0 + c.at.y * h, c.hex);
  }

  let y = PAD + 70 + imgH + 32;
  for (const g of groups) {
    ctx.fillStyle = '#a0a0a0';
    ctx.font = '600 28px system-ui, sans-serif';
    ctx.fillText(fitText(ctx, groupName(g.category?.name).toUpperCase(), imgW), PAD, y + 34);
    y += TITLE_H;
    g.colors.forEach((c, i) => {
      const x = PAD + (i % COLS) * (chipW + GAP);
      const top = y + Math.floor(i / COLS) * ROW_H;
      ctx.fillStyle = c.hex;
      roundRect(ctx, x, top, chipW, CHIP_H, 12);
      ctx.fill();
      ctx.fillStyle = '#e6e6e6';
      ctx.font = '500 26px ui-monospace, Consolas, monospace';
      ctx.fillText(c.hex, x, top + CHIP_H + 34);
    });
    y += Math.ceil(g.colors.length / COLS) * ROW_H;
  }

  ctx.fillStyle = '#a0a0a0';
  ctx.font = '28px system-ui, sans-serif';
  const verdict = best ? `${fr.closest} ${fr.harmonies[best.type]} · ${best.score.toFixed(2).replace('.', ',')}` : fr.unreliable;
  ctx.fillText(fitText(ctx, verdict, imgW), PAD, height - PAD);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encodage PNG impossible'))), 'image/png'),
  );
}

function marker(ctx: CanvasRenderingContext2D, x: number, y: number, hex: string) {
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI * 2);
  ctx.fillStyle = hex;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 13, 0, Math.PI * 2);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.stroke();
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
