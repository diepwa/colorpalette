import { useEffect, useRef, useState } from 'react';
import { mixSteps } from '../engine';
import { fr } from '../i18n/fr';
import type { PickedColor } from '../types';

interface Props {
  from: PickedColor;
  to: PickedColor;
  onSwap: () => void;
  onClose: () => void;
  onCopy: (hex: string) => void;
}

/** Nuances intermédiaires pour passer de la couleur 1 à la couleur 2, avec les proportions de mélange. */
export function Transition({ from, to, onSwap, onClose, onCopy }: Props) {
  const [steps, setSteps] = useState(5);
  const mix = mixSteps(from.lab, to.lab, steps);
  const section = useRef<HTMLElement>(null);

  // Le panneau des couleurs défile : on ramène la transition sous les yeux à son ouverture.
  useEffect(() => section.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }), []);

  return (
    <section ref={section} className="transition" aria-label={fr.transitionHeading}>
      <header className="transition-head">
        <h3 className="palette-title">{fr.transitionHeading}</h3>
        <label className="transition-steps">
          {fr.transitionSteps}
          <input type="range" min={3} max={9} value={steps} onChange={(e) => setSteps(Number(e.target.value))} />
          <span className="chip-score">{steps}</span>
        </label>
        <button type="button" className="link" onClick={onSwap}>
          {fr.transitionSwap}
        </button>
        <button type="button" className="link" onClick={onClose}>
          {fr.transitionClose}
        </button>
      </header>
      <div className="transition-strip" style={{ background: `linear-gradient(90deg, ${mix.map((s) => s.hex).join(', ')})` }} />
      <ol className="transition-steps-list">
        {mix.map((s, i) => {
          const b = Math.round(s.t * 100);
          return (
            <li key={i}>
              <span className="composition-chip" style={{ background: s.hex }} />
              <button type="button" className="swatch-hex" onClick={() => onCopy(s.hex)}>
                {s.hex}
              </button>
              <span className="transition-mix">{fr.transitionMix(100 - b, b)}</span>
            </li>
          );
        })}
      </ol>
      <p className="card-foot">{fr.transitionNote}</p>
    </section>
  );
}
