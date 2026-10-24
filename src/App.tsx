import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { fr } from './i18n/fr';
import { addColor, defaultCategories } from './lib/cards';
import { baseName, download, paletteCardPng, paletteJson, paletteText } from './lib/export';
import { encodeJpeg, isAcceptedImage, loadImage, pixelAt } from './lib/loadImage';
import { createFirestoreStore } from './lib/firestoreStore';
import { createIndexedDbStore, type ImageStore, type SavedImage } from './lib/store';
import { useAccount } from './lib/useAccount';
import { useSwipe } from './lib/useSwipe';
import { Card, type ExportKind } from './components/Card';
import { CardBack } from './components/CardBack';
import { SignInDialog } from './components/SignInDialog';
import type { ImageCard, ImagePoint } from './types';

const localStore = createIndexedDbStore();

type View = 'session' | 'saved';

/** Enregistre (ou met à jour) une carte dans la bibliothèque (locale, ou Firestore une fois connecté). */
async function persist(store: ImageStore, card: ImageCard) {
  const blob = card.blob ?? (card.pixels ? await encodeJpeg(card.pixels) : null);
  if (!blob) throw new Error('Image pas encore prête');
  const savedAt = card.savedAt ?? Date.now();
  await store.put({ id: card.id, name: card.name, savedAt, blob, categories: card.categories, colors: card.colors });
  return { blob, savedAt };
}

export default function App() {
  const [cards, setCards] = useState<ImageCard[]>([]);
  const [view, setView] = useState<View>('session');
  const [indices, setIndices] = useState<Record<View, number>>({ session: 0, saved: 0 });
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [showMarkers, setShowMarkers] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [dropping, setDropping] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const { account, signIn, resetPassword, signOut } = useAccount();
  const [signingIn, setSigningIn] = useState(false);
  const [cloud, setCloud] = useState<{ uid: string; store: ImageStore } | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), Math.max(1600, msg.length * 60));
  }, []);

  const updateCard = (id: string, patch: Partial<ImageCard>) =>
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const visible = cards.filter((c) => (view === 'session' ? c.origin === 'session' : c.saved));
  const savedCount = cards.filter((c) => c.saved).length;
  const index = Math.min(indices[view], Math.max(0, visible.length - 1));
  const setIndex = (next: number | ((i: number) => number)) =>
    setIndices((all) => ({ ...all, [view]: typeof next === 'function' ? next(Math.min(all[view], Math.max(0, visible.length - 1))) : next }));

  // Connecté : Firestore devient la bibliothèque, et les images enregistrées localement y sont transférées.
  const uid = account.status === 'signedIn' ? account.uid : null;
  const db = account.status === 'signedIn' ? account.db : null;
  const store = cloud && cloud.uid === uid ? cloud.store : localStore;
  useEffect(() => {
    if (!uid || !db) return;
    let cancelled = false;
    void (async () => {
      const remote = await createFirestoreStore(db, uid);
      const local = await localStore.list().catch(() => [] as SavedImage[]);
      for (const image of local) {
        await remote.put(image);
        await localStore.remove(image.id);
      }
      if (cancelled) return;
      if (local.length > 0) showToast(fr.migrated(local.length));
      setCloud({ uid, store: remote });
    })().catch(() => showToast(fr.cloudFailed));
    return () => {
      cancelled = true;
    };
  }, [uid, db, showToast]);

  // Bibliothèque chargée au démarrage et à chaque changement de stockage ; les pixels (pipette) sont décodés ensuite.
  useEffect(() => {
    let cancelled = false;
    store
      .list()
      .then((saved: SavedImage[]) => {
        if (cancelled) return;
        const ids = new Set(saved.map((s) => s.id));
        const loaded: ImageCard[] = saved.map((s) => ({
          id: s.id,
          name: s.name,
          url: URL.createObjectURL(s.blob),
          blob: s.blob,
          pixels: null,
          status: 'ready',
          categories: s.categories,
          colors: s.colors,
          activeCategoryId: s.categories[0]?.id ?? null,
          saved: true,
          origin: 'library',
          savedAt: s.savedAt,
        }));
        setCards((cs) => {
          // Les images de la session déjà présentes dans la bibliothèque y restent marquées enregistrées.
          const session = cs
            .filter((c) => c.origin === 'session')
            .map((c) => ({ ...c, saved: ids.has(c.id), savedAt: ids.has(c.id) ? c.savedAt : undefined }));
          const inSession = new Set(session.map((c) => c.id));
          return [...session, ...loaded.filter((c) => !inSession.has(c.id))];
        });
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
  }, [store]);

  const toggleSave = async (card: ImageCard) => {
    try {
      if (card.saved) {
        await store.remove(card.id);
        updateCard(card.id, { saved: false, savedAt: undefined });
        showToast(fr.unsaved);
      } else {
        const { blob, savedAt } = await persist(store, card);
        updateCard(card.id, { saved: true, blob, savedAt });
        showToast(fr.saved);
      }
    } catch {
      showToast(fr.saveFailed);
    }
  };

  /** Modifie une carte, et la réenregistre si elle est dans la bibliothèque. */
  const changeCard = (card: ImageCard, patch: Partial<ImageCard>) => {
    updateCard(card.id, patch);
    if (card.saved && ('colors' in patch || 'categories' in patch)) {
      void persist(store, { ...card, ...patch }).catch(() => showToast(fr.saveFailed));
    }
  };

  const pick = (card: ImageCard, at: ImagePoint) => {
    if (!card.pixels) return;
    const { added, ...patch } = addColor(card, pixelAt(card.pixels, at), at);
    changeCard(card, patch);
    setSelected(added.id);
    const category = card.categories.find((c) => c.id === card.activeCategoryId);
    showToast(fr.picked(added.hex, category?.name ?? null));
  };

  const addFiles = async (files: FileList | File[]) => {
    const accepted = [...files].filter(isAcceptedImage);
    if (accepted.length === 0) return;
    const fresh: ImageCard[] = accepted.map((f) => {
      const categories = defaultCategories();
      return {
        id: crypto.randomUUID(),
        name: f.name,
        url: '',
        pixels: null,
        status: 'loading',
        categories,
        colors: [],
        activeCategoryId: categories[0].id,
        saved: false,
        origin: 'session',
      };
    });
    const firstNew = cards.filter((c) => c.origin === 'session').length;
    setCards((cs) => [...cs, ...fresh]);
    setView('session');
    setIndices((all) => ({ ...all, session: firstNew }));
    setEditing(null);
    await Promise.all(
      accepted.map(async (file, i) => {
        const { id } = fresh[i];
        try {
          const { url, pixels } = await loadImage(file);
          updateCard(id, { url, pixels, status: 'ready' });
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

  const exportCard = async (card: ImageCard, kind: ExportKind) => {
    if (card.colors.length === 0) return showToast(fr.nothingToExport);
    try {
      if (kind === 'text') {
        await navigator.clipboard.writeText(paletteText(card));
        showToast(fr.paletteCopied);
      } else if (kind === 'json') {
        download(new Blob([paletteJson(card)], { type: 'application/json' }), `${baseName(card.name)}-palette.json`);
      } else {
        download(await paletteCardPng(card), `${baseName(card.name)}-palette.png`);
      }
    } catch {
      showToast(fr.exportFailed);
    }
  };

  const go = (delta: number) => {
    setIndex((i) => Math.min(visible.length - 1, Math.max(0, i + delta)));
    setEditing(null);
    setSelected(null);
  };

  const current = visible[index];
  const setFlip = (id: string | undefined, value: boolean) => {
    if (value) setEditing(null);
    setFlipped((f) => {
      if (!id || f.has(id) === value) return f;
      const next = new Set(f);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const { offset, dragging, bind } = useSwipe({
    onSwipeUp: () => go(1),
    onSwipeDown: () => go(-1),
    onSwipeRight: () => current?.status === 'ready' && setFlip(current.id, true),
    onSwipeLeft: () => setFlip(current?.id, false),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, select, textarea')) return;
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
        {account.status === 'signedOut' && (
          <button type="button" className="add" onClick={() => setSigningIn(true)}>
            {fr.signIn}
          </button>
        )}
        {account.status === 'signedIn' && (
          <button
            type="button"
            className="account"
            title={fr.signedInAs(account.name)}
            aria-label={fr.signOut}
            onClick={() => window.confirm(fr.confirmSignOut(account.name)) && void signOut()}
          >
            {(account.name.trim()[0] ?? '?').toUpperCase()}
          </button>
        )}
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
              <p>{account.status === 'signedIn' ? fr.savedEmptyBodyCloud : fr.savedEmptyBody}</p>
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
                        editing={editing === card.id}
                        showMarkers={showMarkers}
                        onToggleMarkers={() => setShowMarkers((v) => !v)}
                        selectedId={selected}
                        onSelect={setSelected}
                        onPick={(at) => pick(card, at)}
                        onChange={(patch) => changeCard(card, patch)}
                        onToggleEdit={() => setEditing((e) => (e === card.id ? null : card.id))}
                        onCopy={copy}
                        onFlip={() => setFlip(card.id, true)}
                        onToggleSave={() => void toggleSave(card)}
                        onExport={(kind) => void exportCard(card, kind)}
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
      {signingIn && (
        <SignInDialog onSignIn={signIn} onResetPassword={resetPassword} onClose={() => setSigningIn(false)} />
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
