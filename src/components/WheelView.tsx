import { useMemo, useState } from 'react';
import { fr } from '../i18n/fr';
import { groupByCategory } from '../lib/cards';
import type { ImageCard, PickedColor } from '../types';
import { ColorChip } from './ColorChip';
import { ColorPath } from './ColorPath';
import { ColorWheel } from './ColorWheel';

interface Props {
  card: ImageCard;
  onCopy: (hex: string) => void;
  onBack: () => void;
}

/** Roue des nuances avec les couleurs prélevées, filtrables par catégorie, et le passage entre celles qu'on sélectionne. */
export function WheelView({ card, onCopy, onBack }: Props) {
  const groups = useMemo(() => groupByCategory(card), [card]);
  // Filtre par catégorie (clé '' = toutes). Une catégorie supprimée revient à « Toutes ».
  const [filter, setFilter] = useState('');
  // Couleurs sélectionnées pour le passage, dans l'ordre où on les touche.
  const [chainIds, setChainIds] = useState<string[]>([]);
  const [steps, setSteps] = useState(5);
  const key = (id: string | null) => id ?? 'none';
  const group = groups.find((g) => key(g.category?.id ?? null) === filter);
  const shown = group ? [group] : groups;
  const colors = shown.flatMap((g) => g.colors);
  const chain = chainIds.map((id) => card.colors.find((c) => c.id === id)).filter((c): c is PickedColor => !!c);
  const toggle = (id: string) => setChainIds((ids) => (ids.includes(id) ? ids.filter((k) => k !== id) : [...ids, id]));

  return (
    <article className="card back" aria-label={fr.backTitle}>
      <header className="view-head">
        <button type="button" className="link" onClick={onBack}>
          {fr.backToImage}
        </button>
        <h2 className="back-eyebrow">{fr.backTitle}</h2>
      </header>

      {card.colors.length === 0 ? (
        <p className="back-empty">{fr.backEmpty}</p>
      ) : (
        <>
          {groups.length > 0 && (
            <div className="harmony-chips" role="group" aria-label={fr.categoryGroup}>
              <button type="button" aria-pressed={!group} onClick={() => setFilter('')}>
                {fr.allCategories}
              </button>
              {groups.map((g) => (
                <button
                  key={key(g.category?.id ?? null)}
                  type="button"
                  aria-pressed={g === group}
                  onClick={() => setFilter(key(g.category?.id ?? null))}
                >
                  {g.category?.name ?? fr.noCategory}
                  <span className="chip-score">{g.colors.length}</span>
                </button>
              ))}
            </div>
          )}

          <ColorWheel colors={colors} chain={chain} steps={steps} label={fr.wheelLabel(colors.length)} onToggle={toggle} />

          <div className="back-colors">
            {chain.length > 0 ? (
              <ColorPath chain={chain} steps={steps} onSteps={setSteps} onClear={() => setChainIds([])} onCopy={onCopy} />
            ) : (
              <p className="back-note">{fr.wheelHint}</p>
            )}
            {shown.map((g) => (
              <section key={key(g.category?.id ?? null)} className="color-group">
                <h3 className="palette-title">{g.category?.name ?? fr.noCategory}</h3>
                <ul className="swatches">
                  {g.colors.map((c) => {
                    const n = chainIds.indexOf(c.id);
                    return (
                      <ColorChip
                        key={c.id}
                        color={c}
                        selected={false}
                        badge={n >= 0 ? String(n + 1) : undefined}
                        onSelect={() => toggle(c.id)}
                        onCopy={onCopy}
                      />
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </article>
  );
}
