import { pickColor } from '../engine';
import { fr } from '../i18n/fr';
import type { Category, ImageCard, ImagePoint, PickedColor } from '../types';

type Editable = Pick<ImageCard, 'categories' | 'colors' | 'activeCategoryId'>;

const uid = () => crypto.randomUUID();

export function newCategory(name: string): Category {
  return { id: uid(), name: name.trim() };
}

/** Catégories proposées sur une nouvelle image. */
export function defaultCategories(): Category[] {
  return fr.defaultCategories.map(newCategory);
}

/** Ajoute la couleur du pixel prélevé à la catégorie active. */
export function addColor(card: Editable, rgb: [number, number, number], at: ImagePoint): Partial<Editable> & { added: PickedColor } {
  const { hex, lab, lch } = pickColor(...rgb);
  const added: PickedColor = { id: uid(), hex, lab, lch, categoryId: card.activeCategoryId, at };
  return { colors: [...card.colors, added], added };
}

export function removeColor(card: Editable, colorId: string): Partial<Editable> {
  return { colors: card.colors.filter((c) => c.id !== colorId) };
}

export function moveColor(card: Editable, colorId: string, categoryId: string | null): Partial<Editable> {
  return { colors: card.colors.map((c) => (c.id === colorId ? { ...c, categoryId } : c)) };
}

/** Ajoute une catégorie et la rend active. Un nom vide ne crée rien. */
export function addCategory(card: Editable, name: string): Partial<Editable> {
  if (!name.trim()) return {};
  const category = newCategory(name);
  return { categories: [...card.categories, category], activeCategoryId: category.id };
}

export function renameCategory(card: Editable, id: string, name: string): Partial<Editable> {
  if (!name.trim()) return {};
  return { categories: card.categories.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)) };
}

/** Supprime une catégorie avec ses couleurs ; la suivante (ou la précédente) devient active. */
export function removeCategory(card: Editable, id: string): Partial<Editable> {
  const index = card.categories.findIndex((c) => c.id === id);
  if (index < 0) return {};
  const categories = card.categories.filter((c) => c.id !== id);
  const activeCategoryId =
    card.activeCategoryId === id ? (categories[Math.min(index, categories.length - 1)]?.id ?? null) : card.activeCategoryId;
  return { categories, colors: card.colors.filter((c) => c.categoryId !== id), activeCategoryId };
}

export interface ColorGroup {
  category: Category | null;
  colors: PickedColor[];
}

/** Couleurs regroupées dans l'ordre des catégories, puis celles sans catégorie. */
export function groupByCategory(card: Pick<ImageCard, 'categories' | 'colors'>, includeEmpty = false): ColorGroup[] {
  const known = new Set(card.categories.map((c) => c.id));
  const groups: ColorGroup[] = card.categories.map((category) => ({
    category,
    colors: card.colors.filter((c) => c.categoryId === category.id),
  }));
  const loose = card.colors.filter((c) => c.categoryId === null || !known.has(c.categoryId));
  if (loose.length > 0) groups.push({ category: null, colors: loose });
  return includeEmpty ? groups : groups.filter((g) => g.colors.length > 0);
}
