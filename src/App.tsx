import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { pickColor } from './engine';
import { fr } from './i18n/fr';
import { extractInWorker } from './lib/extractClient';
import { encodeJpeg, isAcceptedImage, loadImage, pixelAt } from './lib/loadImage';
import { createIndexedDbStore, type SavedImage } from './lib/store';
import { useSwipe } from './lib/useSwipe';
import { Card } from './components/Card';
import { CardBack } from './components/CardBack';
import type { ImageCard } from './types';

const store = createIndexedDbStore();

type View = 'session' | 'saved';

/** Enregistre (ou met à jour) une carte dans la bibliothèque locale. */
async function persist(card: ImageCard) {
  const blob = card.blob ?? (card.pixels ? await encodeJpeg(card.pixels) : null);
  if (!blob) throw new Error('Image pas encore prête');
  const savedAt = card.savedAt ?? Date.now();
  await store.put({ id: card.id, name: card.name, savedAt, blob, palette: card.palette, pinned: card.pinned });
  return { blob, savedAt };
}

export default function App() {
  const [cards, setCards] = useState<ImageCard[]>([]);
  const [view, setView] = useState<View>('session');
  const [indices, setIndices] = useState<Record<View, number>>({ session: 0, saved: 0 });
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

  const visible = cards.filter((c) => (view === 'session' ? c.origin === 'session' : c.saved));
  const savedCount = cards.filter((c) => c.saved).length;
  const index = Math.min(indices[view], Math.max(0, visible.length - 1));
  const setIndex = (next: number | ((i: number) => number)) =>
    setIndices((all) => ({ ...all, [view]: typeof next === 'function' ? next(Math.min(all[view], Math.max(0, visible.length - 1))) : next }));

  // Bibliothèque locale chargée au démarrage ; les pixels (pipette) sont décodés ensuite.
  useEffect(() => {
    let cancelled = false;
    store
      .list()
      .then((saved: SavedImage[]) => {
        if (cancelled) return;
        const loaded: ImageCard[] = saved.map((s) => ({
          id: s.id,
          name: s.name,
          url: URL.createObjectURL(s.blob),
          blob: s.blob,
          pixels: null,
          status: 'ready',
          palette: s.palette,
          pinned: s.pinned,
          saved: true,
          origin: 'library',
          savedAt: s.savedAt,
        }));
        setCards((cs) => [...cs, ...loaded]);
        for (const s of saved) {
          void loadImage(s.blob).then(({ pixels }) => updateCard(s.id, { pixels }));
        }
      })
      .catch(() => {
        /* Stockage indisponible (navigation privée…) : l'app marche sans bibliothèque. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleSave = async (card: ImageCard) => {
    try {
      if (card.saved) {
        await store.remove(card.id);
        updateCard(card.id, { saved: false, savedAt: undefined });
        showToast(fr.unsaved);
      } else {
        const { blob, savedAt } = await persist(card);
        updateCard(card.id, { saved: true, blob, savedAt });
        showToast(fr.saved);
      }
    } catch {
      showToast(fr.saveFailed);
    }
  };

  const setPinned = (card: ImageCard, pinned: ImageCard['pinned']) => {
    updateCard(card.id, { pinned });
    if (card.saved) void persist({ ...card, pinned }).catch(() => showToast(fr.saveFailed));
  };

  const addFiles = async (files: FileList | File[]) => {
    const accepted = [...files].filter(isAcceptedImage);
    if (accepted.length === 0) return;
    const fresh: ImageCard[] = accepted.map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      url: '',
      pixels: null,
      status: 'loading',
      palette: [],
      pinned: [],
      saved: false,
      origin: 'session',
    }));
    const firstNew = cards.filter((c) => c.origin === 'session').length;
    setCards((cs) => [...cs, ...fresh]);
    setView('session');
    setIndices((all) => ({ ...all, session: firstNew }));
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

  const go = (delta: number) => setIndex((i) => Math.min(visible.length - 1, Math.max(0, i + delta)));

  const current = visible[index];
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
    setPinned(card, [...card.pinned, pickColor(r, g, b)]);
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
        {visible.length > 0 && <span className="counter">{fr.counter(index + 1, visible.length)}</span>}
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
      <nav className="tabs" aria-label="Vues">
        <button type="button" aria-pressed={view === 'session'} onClick={() => setView('session')}>
          {fr.tabSession}
        </button>
        <button type="button" aria-pressed={view === 'saved'} onClick={() => setView('saved')}>
          {fr.tabSaved(savedCount)}
        </button>
      </nav>

      {visible.length === 0 ? (
        <main className="empty">
          {view === 'session' ? (
            <div className="empty-box">
              <h2>{fr.emptyTitle}</h2>
              <p>{fr.emptyBody}</p>
              <button type="button" className="add primary" onClick={() => fileInput.current?.click()}>
                {fr.emptyButton}
              </button>
            </div>
          ) : (
            <div className="empty-box">
              <h2>{fr.savedEmptyTitle}</h2>
              <p>{fr.savedEmptyBody}</p>
            </div>
          )}
        </main>
      ) : (
        <main className="stage">
          <div className={`stack${dragging ? ' dragging' : ''}`} {...bind}>
            {visible.map((card, i) => {
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
                        onRemovePin={(p) => setPinned(card, card.pinned.filter((_, k) => k !== p))}
                        onFlip={() => setFlip(card.id, true)}
                        onToggleSave={() => void toggleSave(card)}
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
            <button type="button" aria-label={fr.next} disabled={index === visible.length - 1} onClick={() => go(1)}>
              ↓
            </button>
          </nav>
          {index < visible.length - 1 && <p className="hint">{fr.swipeHint}</p>}
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
