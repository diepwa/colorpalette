import { useMemo, useState } from 'react';
import { analyzeHarmony, generateHarmony, HARMONY_TYPES, type HarmonyType, type PaletteColor } from '../engine';
import { fr } from '../i18n/fr';
import type { ImageCard } from '../types';
import { HarmonyWheel } from './HarmonyWheel';

const fmt = (n: number) => n.toFixed(2).replace('.', ',');

interface Props {
  card: ImageCard;
  onCopy: (hex: string) => void;
  onFlipBack: () => void;
}

/** Couleur de base proposée par défaut : un accent s'il y en a, sinon la couleur chromatique la plus présente. */
function defaultBase(colors: PaletteColor[]): number {
  const accent = colors.findIndex((c) => c.accent);
  if (accent >= 0) return accent;
  const chromatic = colors.findIndex((c) => c.lch.C >= 0.04);
  return Math.max(0, chromatic);
}

/** Verso d'une carte : roue RVB, harmonie la plus proche et compositions générées. */
export function CardBack({ card, onCopy, onFlipBack }: Props) {
  const analysis = useMemo(() => analyzeHarmony(card.palette), [card.palette]);
  const bases = useMemo(() => [...card.palette, ...card.pinned], [card.palette, card.pinned]);
  const best = analysis.ranking[0]?.type ?? 'complementary';
  const [chosen, setChosen] = useState<HarmonyType | null>(null);
  const [baseIndex, setBaseIndex] = useState<number | null>(null);
  const type = chosen ?? best;
  const base = bases[baseIndex ?? defaultBase(bases)];
  const score = analysis.ranking.find((r) => r.type === type);
  const composition = useMemo(() => (base ? generateHarmony(base.lch, type) : []), [base, type]);

  return (
    <article className="card back" aria-label={fr.backTitle}>
      <header className="back-head">
        <span className="back-eyebrow">{fr.backTitle}</span>
        <button type="button" className="flip-button inline" aria-label={fr.flip} onClick={onFlipBack}>
          ⟲
        </button>
        {analysis.reliable && analysis.ranking[0] ? (
          <p className="verdict">
            {fr.closest} <strong>{fr.harmonies[best]}</strong> · {fmt(analysis.ranking[0].score)}
          </p>
        ) : (
          <p className="verdict">{fr.unreliable}</p>
        )}
      </header>

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
          {score.outliers.map((o) => (
            <span key={o.hex} className="mini" style={{ background: o.hex }} title={o.hex} />
          ))}
        </p>
      )}

      <section className="composition">
        <h3 className="palette-title">{fr.compositionFrom}</h3>
        <div className="base-chips" role="group" aria-label={fr.baseGroup}>
          {bases.map((c, i) => (
            <button
              key={c.hex + i}
              type="button"
              className="base-chip"
              style={{ background: c.hex }}
              aria-pressed={c === base}
              aria-label={fr.baseLabel(c.hex)}
              onClick={() => setBaseIndex(i)}
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
    </article>
  );
}
