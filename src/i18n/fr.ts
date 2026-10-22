/** Toutes les chaînes de l'interface, centralisées pour une i18n ultérieure. */
export const fr = {
  appTitle: "Testeur d'harmonies",
  addImages: 'Ajouter des images',
  emptyTitle: 'Dépose tes images ici',
  emptyBody: 'JPG, PNG ou WebP. Tout est analysé dans ton navigateur, aucune image ne quitte ton appareil.',
  emptyButton: 'Choisir des images',
  dropHint: 'Lâche pour ajouter',
  analyzing: 'Analyse des couleurs…',
  loadError: "Impossible de lire cette image.",
  paletteTitle: 'Palette',
  pinnedTitle: 'Épinglées',
  accent: 'accent',
  neutral: 'neutre',
  pickHint: 'Touche l’image pour épingler une couleur',
  swipeHint: 'Glisse vers le haut pour l’image suivante',
  counter: (i: number, n: number) => `${i} / ${n}`,
  copied: (hex: string) => `${hex} copié`,
  copyFailed: (hex: string) => `Copie refusée par le navigateur : ${hex}`,
  removePin: (hex: string) => `Retirer ${hex}`,
  extractedIn: (ms: number) => `Extraction en ${ms} ms`,
  previous: 'Image précédente',
  next: 'Image suivante',
};

export type Strings = typeof fr;
