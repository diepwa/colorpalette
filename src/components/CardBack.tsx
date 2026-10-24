import { useMemo, useState } from 'react';
import { fr } from '../i18n/fr';
import { groupByCategory } from '../lib/cards';
import type { ImageCard } from '../types';
import { ColorWheel } from './ColorWheel';

interface Props {
  card: ImageCard;
  onCopy: (hex: string) => void;
  onFlipBack: () => void;
}

/** Verso d'une carte : les couleurs prélevées placées sur la roue RVB de saturation. */
export function CardBack({ card, onCopy, onFlipBack }: Props) {
  const groups = useMemo(() => groupByCategory(card), [card]);
  // Filtre par catégorie (clé '' = toutes). Une catégorie supprimée revient à « Toutes ».
  const [filter, setFilter] = useState('');
  const [highlight, setHighlight] = useState<string | null>(null);
  const key = (id: string | null) => id ?? 'none';
  const group = groups.find((g) => key(g.category?.id ?? null) === filter);
  const shown = group ? [group] : groups;
  const colors = shown.flatMap((g) => g.colors);

  return (
    <article className="card back" aria-label={fr.backTitle}>
      <header className="back-head">
        <span className="back-eyebrow">{fr.backTitle}</span>
        <button type="button" className="flip-button inline" aria-label={fr.flip} onClick={onFlipBack}>
          ⟲
        </button>
      </header>

      {card.colors.length === 0 ? (
        <p className="back-empty">{fr.backEmpty}</p>
      ) : (
        <>
          {groups.length > 1 && (
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

          <ColorWheel colors={colors} highlightId={highlight} label={fr.wheelLabel(colors.length)} />
          <p className="back-note">{fr.wheelHint}</p>

          <div className="back-colors">
            {shown.map((g) => (
              <section key={key(g.category?.id ?? null)} className="color-group">
                <h3 className="palette-title">{g.category?.name ?? fr.noCategory}</h3>
                <ul className="swatches">
                  {g.colors.map((c) => (
                    <li key={c.id} className={`swatch${c.id === highlight ? ' selected' : ''}`}>
                      <button
                        type="button"
                        className="swatch-chip"
                        style={{ background: c.hex }}
                        aria-pressed={c.id === highlight}
                        aria-label={fr.selectColor(c.hex)}
                        onClick={() => setHighlight(c.id === highlight ? null : c.id)}
                      />
                      <button type="button" className="swatch-hex" onClick={() => onCopy(c.hex)}>
                        {c.hex}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </article>
  );
}
