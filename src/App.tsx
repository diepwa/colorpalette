import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { fr } from './i18n/fr';
import { addColor, defaultCategories } from './lib/cards';
import { encodeJpeg, isAcceptedImage, loadImage, pixelAt } from './lib/loadImage';
import { createFirestoreStore } from './lib/firestoreStore';
import { createIndexedDbStore, type ImageStore, type SavedImage } from './lib/store';
import { useAccount } from './lib/useAccount';
import { Editor } from './components/Editor';
import { Gallery } from './components/Gallery';
import { SignInDialog } from './components/SignInDialog';
import { WheelView } from './components/WheelView';
import type { ImageCard, ImagePoint } from './types';

const localStore = createIndexedDbStore();

type View = 'editor' | 'gallery' | 'wheel';

const newestFirst = (a: ImageCard, b: ImageCard) => b.savedAt - a.savedAt;

export default function App() {
  const [images, setImages] = useState<ImageCard[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [view, setView] = useState<View>('editor');
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [showMarkers, setShowMarkers] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [dropping, setDropping] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  // Écritures en attente par image : une modification attend que l'image soit enregistrée.
  const writes = useRef(new Map<string, Promise<void>>());
  const { account, signIn, resetPassword, signOut } = useAccount();
  const [signingIn, setSigningIn] = useState(false);
  const [cloud, setCloud] = useState<{ uid: string; store: ImageStore } | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), Math.max(1600, msg.length * 60));
  }, []);

  const updateImage = (id: string, patch: Partial<ImageCard>) =>
    setImages((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  // Connecté : Firestore devient la galerie, et les images gardées dans le navigateur y sont transférées.
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

  // Galerie chargée au démarrage et à chaque changement de stockage.
  useEffect(() => {
    let cancelled = false;
    store
      .list()
      .then((saved: SavedImage[]) => {
        if (cancelled) return;
        setImages((cs) => {
          const known = new Map(cs.map((c) => [c.id, c]));
          const loaded = saved.map((s): ImageCard => {
            const prev = known.get(s.id);
            return {
              id: s.id,
              name: s.name,
              url: prev?.url || URL.createObjectURL(s.blob),
              blob: s.blob,
              pixels: prev?.pixels ?? null,
              status: 'ready',
              categories: s.categories,
              colors: s.colors,
              activeCategoryId: prev?.activeCategoryId ?? s.categories[0]?.id ?? null,
              savedAt: s.savedAt,
            };
          });
          // Une image en cours d'import n'est pas encore enregistrée : on la garde.
          const ids = new Set(saved.map((s) => s.id));
          return [...cs.filter((c) => c.status === 'loading' && !ids.has(c.id)), ...loaded].sort(newestFirst);
        });
      })
      .catch(() => {
        /* Stockage indisponible (navigation privée…) : l'app marche sans galerie. */
      });
    return () => {
      cancelled = true;
    };
  }, [store]);

  // Sans image choisie (ou si elle a disparu), on ouvre la plus récente.
  const current = images.find((c) => c.id === currentId) ?? images[0];

  // Les pixels (pipette) ne sont décodés que pour l'image ouverte.
  const needsPixels = current && current.status === 'ready' && !current.pixels ? current : null;
  const decodeId = needsPixels?.id;
  const decodeBlob = needsPixels?.blob;
  useEffect(() => {
    if (!decodeId || !decodeBlob) return;
    void loadImage(decodeBlob).then(({ pixels, url }) => {
      URL.revokeObjectURL(url);
      updateImage(decodeId, { pixels });
    });
  }, [decodeId, decodeBlob]);

  /** Enchaîne une écriture après celles déjà en attente pour la même image. */
  const queueWrite = (id: string, write: () => Promise<void>) => {
    const next = (writes.current.get(id) ?? Promise.resolve())
      .catch(() => undefined)
      .then(write)
      .catch(() => showToast(fr.saveFailed));
    writes.current.set(id, next);
  };

  const changeImage = (card: ImageCard, patch: Partial<ImageCard>) => {
    updateImage(card.id, patch);
    if ('colors' in patch || 'categories' in patch) {
      const next = { ...card, ...patch };
      queueWrite(card.id, () => store.update(card.id, { categories: next.categories, colors: next.colors }));
    }
  };

  const open = (id: string) => {
    setCurrentId(id);
    setView('editor');
    setEditing(false);
    setSelected(null);
  };

  const pick = (card: ImageCard, at: ImagePoint) => {
    if (!card.pixels) return;
    const { added, ...patch } = addColor(card, pixelAt(card.pixels, at), at);
    changeImage(card, patch);
    setSelected(added.id);
    const category = card.categories.find((c) => c.id === card.activeCategoryId);
    showToast(fr.picked(added.hex, category?.name ?? null));
  };

  /** Importe les images, ouvre la première, et les enregistre dans la galerie. */
  const addFiles = async (files: FileList | File[]) => {
    const accepted = [...files].filter(isAcceptedImage);
    if (accepted.length === 0) return;
    const now = Date.now();
    const fresh: ImageCard[] = accepted.map((f, i) => {
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
        // La première image choisie reste en tête de la galerie.
        savedAt: now - i,
      };
    });
    setImages((cs) => [...fresh, ...cs].sort(newestFirst));
    open(fresh[0].id);
    await Promise.all(
      accepted.map(async (file, i) => {
        const card = fresh[i];
        try {
          const { url, pixels } = await loadImage(file);
          updateImage(card.id, { url, pixels, status: 'ready' });
          queueWrite(card.id, async () => {
            const blob = await encodeJpeg(pixels);
            await store.put({ id: card.id, name: card.name, savedAt: card.savedAt, blob, categories: card.categories, colors: [] });
            updateImage(card.id, { blob });
          });
        } catch {
          updateImage(card.id, { status: 'error' });
        }
      }),
    );
  };

  const removeImage = (card: ImageCard) => {
    setImages((cs) => cs.filter((c) => c.id !== card.id));
    if (card.url) URL.revokeObjectURL(card.url);
    queueWrite(card.id, async () => {
      await store.remove(card.id);
      showToast(fr.imageDeleted);
    });
  };

  const copy = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      showToast(fr.copied(hex));
    } catch {
      showToast(fr.copyFailed(hex));
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, select, textarea')) return;
      if (e.key === 'Escape' && view !== 'editor' && current) setView('editor');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDropping(false);
    void addFiles(e.dataTransfer.files);
  };

  const showGallery = view === 'gallery' || (view !== 'editor' && !current);
  const accountName = account.status === 'signedIn' ? account.name : null;

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
        <button type="button" className="add" onClick={() => fileInput.current?.click()}>
          {fr.importImage}
        </button>
        {account.status === 'signedIn' ? (
          <button
            type="button"
            className="account"
            aria-pressed={view === 'gallery'}
            title={`${fr.signedInAs(account.name)} · ${fr.openGallery}`}
            aria-label={fr.openGallery}
            onClick={() => setView((v) => (v === 'gallery' && current ? 'editor' : 'gallery'))}
          >
            {(account.name.trim()[0] ?? '?').toUpperCase()}
          </button>
        ) : (
          <button
            type="button"
            className="account local"
            aria-pressed={view === 'gallery'}
            title={fr.openGallery}
            aria-label={fr.openGallery}
            onClick={() => setView((v) => (v === 'gallery' && current ? 'editor' : 'gallery'))}
          >
            ▦
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

      {showGallery ? (
        <main className="stage">
          <Gallery
            images={images}
            currentId={current?.id ?? null}
            accountName={accountName}
            onOpen={open}
            onRemove={removeImage}
            onBack={() => setView('editor')}
            onSignIn={account.status === 'signedOut' ? () => setSigningIn(true) : null}
            onSignOut={() => void signOut()}
          />
        </main>
      ) : !current ? (
        <main className="empty">
          <div className="empty-box">
            <h2>{fr.emptyTitle}</h2>
            <p>{fr.emptyBody}</p>
            <button type="button" className="add primary" onClick={() => fileInput.current?.click()}>
              {fr.emptyButton}
            </button>
          </div>
        </main>
      ) : view === 'wheel' && current.status === 'ready' ? (
        <main className="stage">
          <WheelView key={current.id} card={current} onCopy={copy} onBack={() => setView('editor')} />
        </main>
      ) : (
        <main className="stage">
          <Editor
            key={current.id}
            card={current}
            editing={editing}
            showMarkers={showMarkers}
            onToggleMarkers={() => setShowMarkers((v) => !v)}
            selectedId={selected}
            onSelect={setSelected}
            onPick={(at) => pick(current, at)}
            onChange={(patch) => changeImage(current, patch)}
            onToggleEdit={() => setEditing((e) => !e)}
            onOpenWheel={() => {
              setEditing(false);
              setView('wheel');
            }}
            onCopy={copy}
          />
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
