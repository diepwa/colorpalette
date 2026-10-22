import type { PaletteColor } from './engine';

export interface ImageCard {
  id: string;
  name: string;
  /** URL locale de l'image d'origine. */
  url: string;
  /** Image réduite enregistrée (JPEG), quand la carte vient de la bibliothèque ou y a été ajoutée. */
  blob?: Blob;
  /** Pixels de l'image réduite, pour la pipette. */
  pixels: ImageData | null;
  status: 'loading' | 'ready' | 'error';
  palette: PaletteColor[];
  /** Couleurs épinglées à la pipette. */
  pinned: PaletteColor[];
  ms?: number;
  /** Enregistrée dans la bibliothèque locale. */
  saved: boolean;
  /** Ajoutée pendant cette session, ou rechargée depuis la bibliothèque. */
  origin: 'session' | 'library';
  savedAt?: number;
}
