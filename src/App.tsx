import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { pickColor } from './engine';
import { fr } from './i18n/fr';
import { extractInWorker } from './lib/extractClient';
import { isAcceptedImage, loadImage, pixelAt } from './lib/loadImage';
import { useSwipe } from './lib/useSwipe';
import { Card } from './components/Card';
import { CardBack } from './components/CardBack';
import type { ImageCard } from './types';

let nextId = 1;

export default function App() {
  const [cards, setCards] = useState<ImageCard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [dropping, setDropping] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1600);
  }, []);

  const updateCard = (id: string, patch: Partial<ImageCard>) =>
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const addFiles = async (files: FileList | File[]) => {
    const accepted = [...files].filter(isAcceptedImage);
    if (accepted.length === 0) return;
    const fresh: ImageCard[] = accepted.map((f) => ({
      id: String(nextId++),
      name: f.name,
      url: '',
      pixels: null,
      status: 'loading',
      palette: [],
      pinned: [],
    }));
    const firstNew = cards.length;
    setCards((cs) => [...cs, ...fresh]);
    setIndex(firstNew);
    await Promise.all(
      accepted.map(async (file, i) => {
        const { id } = fresh[i];
        try {
          const { url, pixels } = await loadImage(file);
          updateCard(id, { url, pixels });
          const { palette, ms } = await extractInWorker(id, pixels.data);
          updateCard(id, { palette, ms, status: 'ready' });
        } catch {
          updateCard(id, { status: 'error' });
        }
      }),
    );
  };

  const copy = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      showToast(fr.copied(hex));
    } catch {
      showToast(fr.copyFailed(hex));
    }
  };

  const go = (delta: number) => setIndex((i) => Math.min(cards.length - 1, Math.max(0, i + delta)));

  const current = cards[index];
  const setFlip = (id: string | undefined, value: boolean) =>
    setFlipped((f) => {
      if (!id || f.has(id) === value) return f;
      const next = new Set(f);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });

  // Pipette : un toucher sur l'image épingle la couleur du pixel touché.
  const pick = (clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('.card-image');
    const card = cards.find((c) => c.id === el?.dataset.cardId);
    if (!el || !card?.pixels || flipped.has(card.id)) return;
    const rect = el.getBoundingClientRect();
    const [r, g, b] = pixelAt(card.pixels, clientX - rect.left, clientY - rect.top, rect.width, rect.height);
    updateCard(card.id, { pinned: [...card.pinned, pickColor(r, g, b)] });
  };

  const { offset, dragging, bind } = useSwipe({
    onSwipeUp: () => go(1),
    onSwipeDown: () => go(-1),
    onSwipeRight: () => current?.status === 'ready' && setFlip(current.id, true),
    onSwipeLeft: () => setFlip(current?.id, false),
    onTap: pick,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') go(1);
      if (e.key === 'ArrowUp' || e.key === 'PageUp') go(-1);
      if (e.key === 'ArrowRight' && current?.status === 'ready') setFlip(current.id, true);
      if (e.key === 'ArrowLeft') setFlip(current?.id, false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Pendant un glissement horizontal, la carte suit le doigt jusqu'à mi-tour.
  const flipAngle = (id: string, isCurrent: boolean) => {
    const baseAngle = flipped.has(id) ? 180 : 0;
    if (!isCurrent || !offset.dx) return baseAngle;
    const drag = Math.max(-90, Math.min(90, (offset.dx / 300) * 90));
    return Math.max(0, Math.min(180, baseAngle + drag));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDropping(false);
    void addFiles(e.dataTransfer.files);
  };

  return (
    <div
      className="app"
      onDragOver={(e) => {
        e.preventDefault();
        setDropping(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDropping(false);
      }}
      onDrop={onDrop}
    >
      <header className="topbar">
        <h1>{fr.appTitle}</h1>
        {cards.length > 0 && <span className="counter">{fr.counter(index + 1, cards.length)}</span>}
        <button type="button" className="add" onClick={() => fileInput.current?.click()}>
          {fr.addImages}
        </button>
        <input
          ref={fileInput}
          type="file"
          id="file-input"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </header>

      {cards.length === 0 ? (
        <main className="empty">
          <div className="empty-box">
            <h2>{fr.emptyTitle}</h2>
            <p>{fr.emptyBody}</p>
            <button type="button" className="add primary" onClick={() => fileInput.current?.click()}>
              {fr.emptyButton}
            </button>
          </div>
        </main>
      ) : (
        <main className="stage">
          <div className={`stack${dragging ? ' dragging' : ''}`} {...bind}>
            {cards.map((card, i) => {
              if (Math.abs(i - index) > 1) return null;
              return (
                <div
                  key={card.id}
                  className="slot"
                  style={{ transform: `translateY(calc(${(i - index) * 100}% + ${(i - index) * 16}px + ${offset.dy}px))` }}
                  aria-hidden={i !== index}
                >
                  <div className="flipper" style={{ transform: `rotateY(${flipAngle(card.id, i === index)}deg)` }}>
                    <div className="face front" aria-hidden={flipped.has(card.id)}>
                      <Card
                        card={card}
                        onCopy={copy}
                        onRemovePin={(p) => updateCard(card.id, { pinned: card.pinned.filter((_, k) => k !== p) })}
                        onFlip={() => setFlip(card.id, true)}
                      />
                    </div>
                    <div className="face back-face" aria-hidden={!flipped.has(card.id)}>
                      {card.status === 'ready' && (flipped.has(card.id) || i === index) && (
                        <CardBack card={card} onCopy={copy} onFlipBack={() => setFlip(card.id, false)} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <nav className="pager">
            <button type="button" aria-label={fr.previous} disabled={index === 0} onClick={() => go(-1)}>
              ↑
            </button>
            <button type="button" aria-label={fr.next} disabled={index === cards.length - 1} onClick={() => go(1)}>
              ↓
            </button>
          </nav>
          {index < cards.length - 1 && <p className="hint">{fr.swipeHint}</p>}
        </main>
      )}

      {dropping && <div className="drop-overlay">{fr.dropHint}</div>}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
