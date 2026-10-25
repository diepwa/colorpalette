/** Toutes les chaînes de l'interface, centralisées pour une i18n ultérieure. */
export const fr = {
  appTitle: "Testeur d'harmonies",
  importImage: 'Importer une image',
  emptyTitle: 'Dépose une image ici',
  emptyBody: 'JPG, PNG ou WebP. Chaque image importée est gardée dans ta galerie avec ses couleurs.',
  emptyButton: 'Choisir une image',
  dropHint: 'Lâche pour ajouter',
  loading: 'Chargement de l’image…',
  loadError: "Impossible de lire cette image.",
  copied: (hex: string) => `${hex} copié`,
  copyFailed: (hex: string) => `Copie refusée par le navigateur : ${hex}`,

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

  // Galerie
  gallery: 'Galerie',
  galleryTitle: (n: number) => `Galerie (${n})`,
  openGallery: 'Ouvrir la galerie',
  backToImage: '← Retour à l’image',
  galleryEmpty: 'Aucune image pour l’instant. Importe une image pour commencer.',
  galleryLocal: 'Images gardées dans ce navigateur. Connecte-toi pour les retrouver sur tes autres appareils.',
  colorCount: (n: number) => `${n} couleur${n > 1 ? 's' : ''}`,
  deleteImage: (name: string) => `Supprimer ${name}`,
  confirmDeleteImage: (name: string) => `Supprimer « ${name} » et ses couleurs ?`,
  imageDeleted: 'Image supprimée',
  saveFailed: 'Enregistrement impossible',

  // Compte (Firestore)
  signIn: 'Connexion',
  signOut: 'Se déconnecter',
  signedInAs: (name: string) => `Connecté : ${name}`,
  signInTitle: 'Connexion à ta galerie',
  email: 'Email',
  password: 'Mot de passe',
  signingIn: 'Connexion…',
  forgotPassword: 'Mot de passe oublié ?',
  resetNeedsEmail: 'Indique d’abord ton email.',
  resetSent: (email: string) => `Email de réinitialisation envoyé à ${email}.`,
  signInError: (code: string | undefined) =>
    code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found'
      ? 'Email ou mot de passe incorrect.'
      : code === 'auth/invalid-email'
        ? 'Adresse email invalide.'
        : code === 'auth/too-many-requests'
          ? 'Trop d’essais : réessaie dans quelques minutes.'
          : code === 'auth/network-request-failed'
            ? 'Pas de connexion internet.'
            : code === 'auth/operation-not-allowed'
              ? 'Connexion par email pas activée dans Firebase > Authentication.'
              : `Connexion impossible${code ? ` (${code})` : ''}.`,
  cloudFailed: 'Bibliothèque en ligne indisponible',
  migrated: (n: number) => `${n} image${n > 1 ? 's' : ''} transférée${n > 1 ? 's' : ''} dans ton compte`,

  // Roue
  openWheel: 'Voir la roue des nuances',
  backTitle: 'Roue des nuances',
  backEmpty: 'Prélève des couleurs sur l’image pour les voir sur la roue.',
  allCategories: 'Toutes',
  wheelLabel: (n: number) => `Roue des nuances avec ${n} couleur${n > 1 ? 's' : ''} prélevée${n > 1 ? 's' : ''}`,
  wheelHint:
    'Autour du centre, les pigments purs. Vers l’extérieur, chaque teinte va du plus foncé au pigment pur, puis au plus pâle. Chaque couleur est posée sur la case la plus proche, les gris au centre. Touche plusieurs couleurs pour voir le passage de l’une à l’autre.',
  pathHeading: 'Passage',
  pathPickMore: 'Touche une deuxième couleur, sur la roue ou dans la liste.',
  pathSteps: 'Nuances',
  pathClear: 'Effacer',
  pathSegment: (a: number, b: number) => `${a} → ${b}`,
  pathMix: (a: number, b: number) => `${a} / ${b}`,
  pathNote:
    'Proportions de mélange « couleur de départ / couleur d’arrivée ». Le calcul suit ce que l’œil voit à l’écran : avec de vrais pigments, ajuste à l’œil.',
  toggleColor: (hex: string, n: number | null) => (n ? `Retirer ${hex} du passage (n° ${n})` : `Ajouter ${hex} au passage`),
};

export type Strings = typeof fr;
