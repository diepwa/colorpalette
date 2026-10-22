import type { ImageCard } from '../types';
import { fr } from '../i18n/fr';
import { Swatch } from './Swatch';

interface Props {
  card: ImageCard;
  onCopy: (hex: string) => void;
  onRemovePin: (index: number) => void;
  onFlip: () => void;
  onToggleSave: () => void;
}

/** Recto d'une carte : l'image et sa palette. */
export function Card({ card, onCopy, onRemovePin, onFlip, onToggleSave }: Props) {
  return (
    <article className="card" aria-label={card.name}>
      <div className="card-image" data-card-id={card.id}>
        <img src={card.url} alt={card.name} draggable={false} />
        {card.status === 'loading' && <div className="card-status">{fr.analyzing}</div>}
        {card.status === 'error' && <div className="card-status">{fr.loadError}</div>}
        {card.status === 'ready' && (
          <div className="card-actions">
            <button
              type="button"
              className={`round-button${card.saved ? ' on' : ''}`}
              aria-label={card.saved ? fr.unsave : fr.save}
              aria-pressed={card.saved}
              title={card.saved ? fr.unsave : fr.save}
              onClick={onToggleSave}
            >
              {card.saved ? '★' : '☆'}
            </button>
            <button type="button" className="round-button" aria-label={fr.flip} title={fr.flipHint} onClick={onFlip}>
              ⟳
            </button>
          </div>
        )}
      </div>
      <div className="card-palette">
        {card.status === 'ready' && (
          <>
            <ul className="swatches">
              {card.palette.map((c) => (
                <Swatch key={c.hex + c.proportion} color={c} onCopy={onCopy} />
              ))}
            </ul>
            {card.pinned.length > 0 && (
              <>
                <h3 className="palette-title">{fr.pinnedTitle}</h3>
                <ul className="swatches">
                  {card.pinned.map((c, i) => (
                    <Swatch key={c.hex + i} color={c} kind="pinned" onCopy={onCopy} onRemove={() => onRemovePin(i)} />
                  ))}
                </ul>
              </>
            )}
            <p className="card-foot">
              {fr.pickHint}
              {card.ms !== undefined && ` · ${fr.extractedIn(card.ms)}`}
            </p>
          </>
        )}
      </div>
    </article>
  );
}
