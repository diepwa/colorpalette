import { fr } from '../i18n/fr';
import type { ImageCard } from '../types';

interface Props {
  images: ImageCard[];
  currentId: string | null;
  /** Nom du compte connecté ; null quand les images restent dans le navigateur. */
  accountName: string | null;
  onOpen: (id: string) => void;
  onRemove: (card: ImageCard) => void;
  onBack: () => void;
  onSignIn: (() => void) | null;
  onSignOut: () => void;
}

/** Grille des images importées, les plus récentes en premier. */
export function Gallery({ images, currentId, accountName, onOpen, onRemove, onBack, onSignIn, onSignOut }: Props) {
  return (
    <section className="card gallery" aria-label={fr.gallery}>
      <header className="view-head">
        {currentId && (
          <button type="button" className="link" onClick={onBack}>
            {fr.backToImage}
          </button>
        )}
        <h2 className="back-eyebrow">{fr.galleryTitle(images.length)}</h2>
      </header>

      <div className="gallery-account">
        {accountName ? (
          <>
            <span>{fr.signedInAs(accountName)}</span>
            <button type="button" className="link" onClick={onSignOut}>
              {fr.signOut}
            </button>
          </>
        ) : (
          <>
            <span>{fr.galleryLocal}</span>
            {onSignIn && (
              <button type="button" className="link" onClick={onSignIn}>
                {fr.signIn}
              </button>
            )}
          </>
        )}
      </div>

      {images.length === 0 ? (
        <p className="back-empty">{fr.galleryEmpty}</p>
      ) : (
        <ul className="gallery-grid">
          {images.map((card) => (
            <li key={card.id} className={`tile${card.id === currentId ? ' current' : ''}`}>
              <button type="button" className="tile-open" onClick={() => onOpen(card.id)}>
                {card.url ? <img src={card.url} alt="" /> : <span className="tile-placeholder" />}
                <span className="tile-strip" aria-hidden>
                  {card.colors.slice(0, 16).map((c) => (
                    <span key={c.id} style={{ background: c.hex }} />
                  ))}
                </span>
                <span className="tile-name">{card.name}</span>
                <span className="tile-count">{fr.colorCount(card.colors.length)}</span>
              </button>
              <button
                type="button"
                className="tile-remove"
                aria-label={fr.deleteImage(card.name)}
                title={fr.deleteImage(card.name)}
                onClick={() => window.confirm(fr.confirmDeleteImage(card.name)) && onRemove(card)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
