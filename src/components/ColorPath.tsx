import { mixSteps } from '../engine';
import { fr } from '../i18n/fr';
import type { PickedColor } from '../types';

interface Props {
  chain: PickedColor[];
  steps: number;
  onSteps: (n: number) => void;
  onClear: () => void;
  onCopy: (hex: string) => void;
}

/** Passage d'une couleur sélectionnée à la suivante : nuances intermédiaires et proportions de mélange. */
export function ColorPath({ chain, steps, onSteps, onClear, onCopy }: Props) {
  return (
    <section className="transition" aria-label={fr.pathHeading}>
      <header className="transition-head">
        <h3 className="palette-title">{fr.pathHeading}</h3>
        {chain.length > 1 && (
          <label className="transition-steps">
            {fr.pathSteps}
            <input type="range" min={3} max={9} value={steps} onChange={(e) => onSteps(Number(e.target.value))} />
            <span className="chip-score">{steps}</span>
          </label>
        )}
        <button type="button" className="link" onClick={onClear}>
          {fr.pathClear}
        </button>
      </header>
      {chain.length < 2 && <p className="card-foot">{fr.pathPickMore}</p>}
      {chain.slice(1).map((to, i) => {
        const mix = mixSteps(chain[i].lab, to.lab, steps);
        return (
          <div key={`${chain[i].id}-${to.id}`} className="path-segment">
            <span className="path-label">{fr.pathSegment(i + 1, i + 2)}</span>
            <div className="transition-strip" style={{ background: `linear-gradient(90deg, ${mix.map((s) => s.hex).join(', ')})` }} />
            <ol className="transition-steps-list">
              {mix.map((s, k) => {
                const b = Math.round(s.t * 100);
                return (
                  <li key={k}>
                    <span className="composition-chip" style={{ background: s.hex }} />
                    <button type="button" className="swatch-hex" onClick={() => onCopy(s.hex)}>
                      {s.hex}
                    </button>
                    <span className="transition-mix">{fr.pathMix(100 - b, b)}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}
      {chain.length > 1 && <p className="card-foot">{fr.pathNote}</p>}
    </section>
  );
}
