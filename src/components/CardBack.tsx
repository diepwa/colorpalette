import { useMemo, useState } from 'react';
import { analyzeHarmony, generateHarmony, HARMONY_TYPES, type HarmonyType } from '../engine';
import { fr } from '../i18n/fr';
import { groupByCategory } from '../lib/cards';
import type { ImageCard, PickedColor } from '../types';
import { HarmonyWheel } from './HarmonyWheel';

const fmt = (n: number) => n.toFixed(2).replace('.', ',');

/** Couleurs analysées à poids égal : chaque prélèvement compte autant. */
function analysisInput(colors: PickedColor[]) {
  return colors.map((c) => ({ hex: c.hex, lch: c.lch, proportion: 1 / colors.length }));
}

interface Props {
  card: ImageCard;
  onCopy: (hex: string) => void;
  onFlipBack: () => void;
}

/** Verso d'une carte : tes couleurs sur la roue RVB, harmonie la plus proche et compositions. */
export function CardBack({ card, onCopy, onFlipBack }: Props) {
  const groups = useMemo(() => groupByCategory(card), [card]);
  // Filtre par catégorie (clé '' = toutes). Une catégorie supprimée revient à « Toutes ».
  const [filter, setFilter] = useState('');
  const key = (id: string | null) => id ?? 'none';
  const group = groups.find((g) => key(g.category?.id ?? null) === filter);
  const colors = useMemo(() => (group ? group.colors : card.colors), [group, card.colors]);

  const analysis = useMemo(() => analyzeHarmony(analysisInput(colors)), [colors]);
  const best = analysis.ranking[0]?.type ?? 'complementary';
  const [chosen, setChosen] = useState<HarmonyType | null>(null);
  const [baseId, setBaseId] = useState<string | null>(null);
  const type = chosen ?? best;
  const base = colors.find((c) => c.id === baseId) ?? colors.find((c) => c.lch.C >= 0.04) ?? colors[0];
  const score = analysis.ranking.find((r) => r.type === type);
  const composition = useMemo(() => (base ? generateHarmony(base.lch, type) : []), [base, type]);

  return (
    <article className="card back" aria-label={fr.backTitle}>
      <header className="back-head">
        <span className="back-eyebrow">{fr.backTitle}</span>
        <button type="button" className="flip-button inline" aria-label={fr.flip} onClick={onFlipBack}>
          ⟲
        </button>
        {colors.length > 0 &&
          (analysis.reliable && analysis.ranking[0] ? (
            <p className="verdict">
              {fr.closest} <strong>{fr.harmonies[best]}</strong> · {fmt(analysis.ranking[0].score)}
            </p>
          ) : (
            <p className="verdict">{fr.unreliable}</p>
          ))}
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

          <HarmonyWheel analysis={analysis} harmony={score} label={fr.wheelLabel(fr.harmonies[type])} />

          <div className="harmony-chips" role="group" aria-label={fr.harmonyGroup}>
            {HARMONY_TYPES.map((t) => {
              const s = analysis.ranking.find((r) => r.type === t);
              return (
                <button key={t} type="button" aria-pressed={t === type} onClick={() => setChosen(t)}>
                  {fr.harmonies[t]}
                  {s && <span className="chip-score">{fmt(s.score)}</span>}
                </button>
              );
            })}
          </div>
          {score && score.outliers.length > 0 && (
            <p className="back-note">
              {fr.outOfScheme}{' '}
              {score.outliers.map((o, i) => (
                <span key={o.hex + i} className="mini" style={{ background: o.hex }} title={o.hex} />
              ))}
            </p>
          )}

          <section className="composition">
            <h3 className="palette-title">{fr.compositionFrom}</h3>
            <div className="base-chips" role="group" aria-label={fr.baseGroup}>
              {colors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="base-chip"
                  style={{ background: c.hex }}
                  aria-pressed={c === base}
                  aria-label={fr.baseLabel(c.hex)}
                  onClick={() => setBaseId(c.id)}
                />
              ))}
            </div>
            <ul className="composition-swatches">
              {composition.map((h, i) => (
                <li key={h.hex + i}>
                  <span className="composition-chip" style={{ background: h.hex }} />
                  <button type="button" className="swatch-hex" onClick={() => onCopy(h.hex)}>
                    {h.hex}
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <p className="card-foot">{fr.approximation}</p>
        </>
      )}
    </article>
  );
}
