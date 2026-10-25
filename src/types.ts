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
  /** Image réduite enregistrée (JPEG), une fois l'image dans la galerie. */
  blob?: Blob;
  /** Pixels de l'image réduite, pour la pipette. */
  pixels: ImageData | null;
  status: 'loading' | 'ready' | 'error';
  categories: Category[];
  colors: PickedColor[];
  /** Catégorie qui reçoit les prochaines couleurs prélevées. */
  activeCategoryId: string | null;
  /** Date d'import : la galerie montre les plus récentes en premier. */
  savedAt: number;
}
