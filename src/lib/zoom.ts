/** Zoom de l'image : agrandissement puis décalage, en px du cadre. */
export interface View {
  scale: number;
  tx: number;
  ty: number;
}

export const MAX_ZOOM = 8;

/** Garde le zoom entre 1 et MAX_ZOOM, et l'image agrandie couvrant le cadre (pas de bord vide qui dérive). */
export function clampView(view: View, w: number, h: number): View {
  const scale = Math.min(MAX_ZOOM, Math.max(1, view.scale));
  const tx = Math.min(0, Math.max(w - w * scale, view.tx));
  const ty = Math.min(0, Math.max(h - h * scale, view.ty));
  return { scale, tx, ty };
}

/** Zoome d'un facteur en gardant fixe le point (x, y) du cadre. */
export function zoomAt(view: View, factor: number, x: number, y: number): View {
  const scale = view.scale * factor;
  const cx = (x - view.tx) / view.scale;
  const cy = (y - view.ty) / view.scale;
  return { scale, tx: x - cx * scale, ty: y - cy * scale };
}
