import { describe, expect, it } from 'vitest';
import type { ImageCard } from '../types';
import { addCategory, addColor, groupByCategory, moveColor, removeCategory, removeColor, renameCategory } from './cards';
import { picked } from './testColors';

type Editable = Pick<ImageCard, 'categories' | 'colors' | 'activeCategoryId'>;

const base = (): Editable => ({
  categories: [
    { id: 'face', name: 'Visage' },
    { id: 'cloth', name: 'Vêtements' },
  ],
  colors: [picked('1', '#e0a080', 'face'), picked('2', '#b0120f', 'cloth')],
  activeCategoryId: 'cloth',
});

describe('couleurs et catégories', () => {
  it('range la couleur prélevée dans la catégorie active, avec sa position', () => {
    const { colors, added } = addColor(base(), [255, 0, 0], { x: 0.25, y: 0.75 });
    expect(colors).toHaveLength(3);
    expect(added).toMatchObject({ hex: '#ff0000', categoryId: 'cloth', at: { x: 0.25, y: 0.75 } });
  });

  it('déplace et retire une couleur', () => {
    const card = base();
    expect(moveColor(card, '1', 'cloth').colors!.map((c) => c.categoryId)).toEqual(['cloth', 'cloth']);
    expect(removeColor(card, '1').colors!.map((c) => c.id)).toEqual(['2']);
  });

  it('ajoute une catégorie active, ignore un nom vide, renomme', () => {
    const card = base();
    const added = addCategory(card, '  Cheveux ');
    expect(added.categories!.at(-1)!.name).toBe('Cheveux');
    expect(added.activeCategoryId).toBe(added.categories!.at(-1)!.id);
    expect(addCategory(card, '   ')).toEqual({});
    expect(renameCategory(card, 'face', 'Peau').categories![0].name).toBe('Peau');
  });

  it('supprime une catégorie avec ses couleurs et choisit la catégorie active suivante', () => {
    const patch = removeCategory(base(), 'cloth');
    expect(patch.categories!.map((c) => c.id)).toEqual(['face']);
    expect(patch.colors!.map((c) => c.id)).toEqual(['1']);
    expect(patch.activeCategoryId).toBe('face');
    expect(removeCategory({ ...base(), categories: [base().categories[0]], activeCategoryId: 'face' }, 'face').activeCategoryId).toBeNull();
  });

  it('regroupe dans l’ordre des catégories, puis les couleurs sans catégorie', () => {
    const card = { ...base(), colors: [...base().colors, picked('3', '#2050a0', null), picked('4', '#000000', 'gone')] };
    const groups = groupByCategory({ ...card, categories: [...card.categories, { id: 'hair', name: 'Cheveux' }] });
    expect(groups.map((g) => g.category?.name ?? null)).toEqual(['Visage', 'Vêtements', null]);
    expect(groups[2].colors.map((c) => c.id)).toEqual(['3', '4']);
    expect(groupByCategory({ ...card, categories: [...card.categories, { id: 'hair', name: 'Cheveux' }] }, true)).toHaveLength(4);
  });
});
