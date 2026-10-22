import type { PaletteColor } from './engine';

export interface ImageCard {
  id: string;
  name: string;
  /** URL locale de l'image d'origine. */
  url: string;
  /** Pixels de l'image réduite, pour la pipette. */
  pixels: ImageData | null;
  status: 'loading' | 'ready' | 'error';
  palette: PaletteColor[];
  /** Couleurs épinglées à la pipette. */
  pinned: PaletteColor[];
  ms?: number;
}
