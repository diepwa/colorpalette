import type { Lab, Lch } from './engine';

/** Groupe de couleurs nommé par l'utilisateur (visage, vêtements…). */
export interface Category {
  id: string;
  name: string;
}

/** Position normalisée sur l'image : (0, 0) en haut à gauche, (1, 1) en bas à droite. */
export interface ImagePoint {
  x: number;
  y: number;
}

/** Couleur prélevée à la pipette. */
export interface PickedColor {
  id: string;
  hex: string;
  lab: Lab;
  lch: Lch;
  /** Catégorie de la couleur ; null si elle n'est rangée nulle part. */
  categoryId: string | null;
  /** Endroit du prélèvement ; absent pour les couleurs reprises d'une ancienne version. */
  at?: ImagePoint;
}

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
  categories: Category[];
  colors: PickedColor[];
  /** Catégorie qui reçoit les prochaines couleurs prélevées. */
  activeCategoryId: string | null;
  /** Enregistrée dans la bibliothèque locale. */
  saved: boolean;
  /** Ajoutée pendant cette session, ou rechargée depuis la bibliothèque. */
  origin: 'session' | 'library';
  savedAt?: number;
}
