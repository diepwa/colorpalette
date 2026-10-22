/** Grand côté maximal de l'image analysée : assez pour la palette, rapide à traiter. */
export const ANALYSIS_MAX_SIDE = 800;

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface LoadedImage {
  /** URL locale de l'image d'origine, pour l'affichage. */
  url: string;
  /** Pixels RGBA de l'image réduite, pour l'analyse et la pipette. */
  pixels: ImageData;
}

export function isAcceptedImage(file: File): boolean {
  return ACCEPTED_TYPES.includes(file.type);
}

/** Lit un fichier image et le réduit en interne avant l'analyse. */
export async function loadImage(file: File): Promise<LoadedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, ANALYSIS_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
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

/**
 * Pixel de l'image réduite sous un point affiché, pour une image rendue en object-fit: cover.
 * (x, y) sont relatifs au cadre affiché de taille (boxW, boxH).
 */
export function pixelAt(pixels: ImageData, x: number, y: number, boxW: number, boxH: number): [number, number, number] {
  const scale = Math.max(boxW / pixels.width, boxH / pixels.height);
  const offsetX = (boxW - pixels.width * scale) / 2;
  const offsetY = (boxH - pixels.height * scale) / 2;
  const px = Math.min(pixels.width - 1, Math.max(0, Math.floor((x - offsetX) / scale)));
  const py = Math.min(pixels.height - 1, Math.max(0, Math.floor((y - offsetY) / scale)));
  const o = (py * pixels.width + px) * 4;
  return [pixels.data[o], pixels.data[o + 1], pixels.data[o + 2]];
}
