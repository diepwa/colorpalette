import { useState, type FormEvent } from 'react';
import { fr } from '../i18n/fr';
import type { Category, PickedColor } from '../types';

interface Props {
  categories: Category[];
  colors: PickedColor[];
  activeId: string | null;
  onActivate: (id: string) => void;
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}

type Draft = { mode: 'add' } | { mode: 'rename'; id: string };

/** Catégories de la carte en mode édition : la catégorie active reçoit les couleurs prélevées. */
export function CategoryBar({ categories, colors, activeId, onActivate, onAdd, onRename, onRemove }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [name, setName] = useState('');
  const active = categories.find((c) => c.id === activeId);

  const open = (next: Draft, initial = '') => {
    setDraft(next);
    setName(initial);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (draft?.mode === 'add') onAdd(name);
    else if (draft?.mode === 'rename') onRename(draft.id, name);
    setDraft(null);
  };

  const remove = (category: Category) => {
    const n = colors.filter((c) => c.categoryId === category.id).length;
    if (n === 0 || window.confirm(fr.confirmDeleteCategory(category.name, n))) onRemove(category.id);
  };

  return (
    <div className="category-bar">
      <div className="category-chips" role="group" aria-label={fr.categoryGroup}>
        {categories.map((c) => (
          <button key={c.id} type="button" aria-pressed={c.id === activeId} onClick={() => onActivate(c.id)}>
            {c.name}
            <span className="chip-score">{colors.filter((k) => k.categoryId === c.id).length}</span>
          </button>
        ))}
        <button type="button" className="add-category" onClick={() => open({ mode: 'add' })}>
          {fr.addCategory}
        </button>
      </div>
      {draft ? (
        <form className="category-form" onSubmit={submit}>
          <input
            autoFocus
            value={name}
            maxLength={40}
            placeholder={fr.newCategoryPlaceholder}
            aria-label={fr.newCategoryPlaceholder}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" disabled={!name.trim()}>
            {fr.ok}
          </button>
          <button type="button" onClick={() => setDraft(null)}>
            {fr.cancel}
          </button>
        </form>
      ) : (
        active && (
          <p className="category-line">
            <span>{fr.activeCategory(active.name)}</span>
            <button type="button" className="link" onClick={() => open({ mode: 'rename', id: active.id }, active.name)}>
              {fr.renameCategory}
            </button>
            <button type="button" className="link" onClick={() => remove(active)}>
              {fr.deleteCategory}
            </button>
          </p>
        )
      )}
    </div>
  );
}
