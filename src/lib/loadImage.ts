import type { ImagePoint } from '../types';

/** Grand côté maximal de l'image gardée pour la pipette : assez fin pour viser un détail. */
export const PICK_MAX_SIDE = 1600;

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface LoadedImage {
  /** URL locale de l'image d'origine, pour l'affichage. */
  url: string;
  /** Pixels RGBA de l'image réduite, pour la pipette. */
  pixels: ImageData;
}

export function isAcceptedImage(file: File): boolean {
  return ACCEPTED_TYPES.includes(file.type);
}

/** Lit un fichier image et le réduit en interne. */
export async function loadImage(file: Blob): Promise<LoadedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PICK_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D indisponible');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return { url: URL.createObjectURL(file), pixels: ctx.getImageData(0, 0, width, height) };
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Zone occupée par une image affichée en object-fit: contain dans un cadre (boxW, boxH). */
export function containRect(boxW: number, boxH: number, imgW: number, imgH: number): Rect {
  const scale = Math.min(boxW / imgW, boxH / imgH);
  const width = imgW * scale;
  const height = imgH * scale;
  return { x: (boxW - width) / 2, y: (boxH - height) / 2, width, height };
}

/** Point du cadre converti en position normalisée sur l'image, ou null hors de l'image. */
export function toImagePoint(rect: Rect, x: number, y: number): ImagePoint | null {
  const u = (x - rect.x) / rect.width;
  const v = (y - rect.y) / rect.height;
  if (u < 0 || u >= 1 || v < 0 || v >= 1) return null;
  return { x: u, y: v };
}

/** Coordonnées du pixel sous une position normalisée. */
export function pixelCoords(pixels: { width: number; height: number }, p: ImagePoint): [number, number] {
  return [
    Math.min(pixels.width - 1, Math.max(0, Math.floor(p.x * pixels.width))),
    Math.min(pixels.height - 1, Math.max(0, Math.floor(p.y * pixels.height))),
  ];
}

/** Couleur RVB du pixel sous une position normalisée. */
export function pixelAt(pixels: ImageData, p: ImagePoint): [number, number, number] {
  const [px, py] = pixelCoords(pixels, p);
  const o = (py * pixels.width + px) * 4;
  return [pixels.data[o], pixels.data[o + 1], pixels.data[o + 2]];
}

/** Encode les pixels réduits en JPEG, pour l'enregistrement. */
export function encodeJpeg(pixels: ImageData, quality = 0.9): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = pixels.width;
  canvas.height = pixels.height;
  canvas.getContext('2d')?.putImageData(pixels, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encodage JPEG impossible'))), 'image/jpeg', quality),
  );
}
