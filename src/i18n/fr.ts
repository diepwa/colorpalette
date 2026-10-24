/** Toutes les chaînes de l'interface, centralisées pour une i18n ultérieure. */
export const fr = {
  appTitle: "Testeur d'harmonies",
  addImages: 'Ajouter des images',
  emptyTitle: 'Dépose tes images ici',
  emptyBody: 'JPG, PNG ou WebP. Tout se passe dans ton navigateur, aucune image ne quitte ton appareil.',
  emptyButton: 'Choisir des images',
  dropHint: 'Lâche pour ajouter',
  loading: 'Chargement de l’image…',
  loadError: "Impossible de lire cette image.",
  swipeHint: 'Glisse vers le haut pour l’image suivante',
  counter: (i: number, n: number) => `${i} / ${n}`,
  copied: (hex: string) => `${hex} copié`,
  copyFailed: (hex: string) => `Copie refusée par le navigateur : ${hex}`,
  previous: 'Image précédente',
  next: 'Image suivante',
  flip: 'Retourner la carte',
  flipHint: 'Voir la roue RVB',

  // Mode édition et pipette
  edit: 'Mode édition',
  editDone: 'Terminer l’édition',
  editBanner: 'Touche l’image pour prélever une couleur',
  picked: (hex: string, category: string | null) => (category ? `${hex} ajouté à ${category}` : `${hex} ajouté`),
  noColors: 'Aucune couleur prélevée. Touche ✎ pour passer en mode édition.',
  noColorsEditing: 'Touche l’image : une loupe t’aide à viser, la couleur est prise quand tu lâches.',
  removeColor: (hex: string) => `Retirer ${hex}`,
  selectColor: (hex: string) => `Sélectionner ${hex}`,
  moveTo: 'Ranger dans',
  showMarkers: 'Afficher les repères',
  hideMarkers: 'Masquer les repères',
  zoomIn: 'Zoomer',
  zoomOut: 'Dézoomer',
  zoomReset: 'Revenir à l’image entière',

  // Transition entre deux couleurs
  transition: '◐ Transition',
  transitionTitle: 'Voir la transition entre deux couleurs',
  transitionPickFirst: 'Touche la couleur de départ',
  transitionPickSecond: 'Touche la couleur d’arrivée',
  transitionHeading: 'Transition',
  transitionSteps: 'Nuances',
  transitionSwap: 'Inverser',
  transitionClose: 'Fermer',
  transitionMix: (a: number, b: number) => `${a} / ${b}`,
  transitionNote:
    'Proportions « couleur 1 / couleur 2 » pour chaque nuance. Le calcul suit la perception à l’écran : avec de vrais pigments, ajuste à l’œil.',

  // Catégories
  defaultCategories: ['Visage', 'Vêtements'],
  categoryGroup: 'Catégories',
  addCategory: '+ Catégorie',
  newCategoryPlaceholder: 'Nom de la catégorie',
  renameCategory: 'Renommer',
  deleteCategory: 'Supprimer',
  confirmDeleteCategory: (name: string, n: number) =>
    n > 0 ? `Supprimer « ${name} » et ses ${n} couleur${n > 1 ? 's' : ''} ?` : `Supprimer « ${name} » ?`,
  ok: 'OK',
  cancel: 'Annuler',
  activeCategory: (name: string) => `Les couleurs vont dans « ${name} »`,
  noCategory: 'Sans catégorie',
  legacyPalette: 'Palette auto',
  legacyPinned: 'Épinglées',

  // Enregistrement
  save: 'Enregistrer',
  unsave: 'Retirer des enregistrées',
  saved: 'Image enregistrée',
  unsaved: 'Image retirée des enregistrées',
  saveFailed: 'Enregistrement impossible dans ce navigateur',
  tabSession: 'Nouvelles',
  tabSaved: (n: number) => `Enregistrées (${n})`,
  savedEmptyTitle: 'Aucune image enregistrée',
  savedEmptyBody: 'Touche ☆ sur une carte pour la garder ici. Les images restent dans ce navigateur.',

  // Verso
  backTitle: 'Roue RVB',
  backEmpty: 'Prélève des couleurs sur l’image pour les voir sur la roue.',
  allCategories: 'Toutes',
  wheelLabel: (n: number) => `Roue RVB avec ${n} couleur${n > 1 ? 's' : ''} prélevée${n > 1 ? 's' : ''}`,
  wheelHint: 'Teinte autour de la roue, saturation du centre (gris) vers le bord (couleur pure).',

  // Exports
  exportGroup: 'Exporter',
  copyPalette: 'Copier',
  copyPaletteTitle: 'Copier les couleurs en texte, par catégorie',
  exportPng: 'PNG',
  exportPngTitle: 'Télécharger la carte des couleurs en PNG',
  exportJson: 'JSON',
  exportJsonTitle: 'Télécharger les couleurs et les catégories en JSON',
  paletteCopied: 'Couleurs copiées',
  exportFailed: 'Export impossible',
  nothingToExport: 'Prélève d’abord des couleurs',
};

export type Strings = typeof fr;
