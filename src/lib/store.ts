import { fr } from '../i18n/fr';
import type { Category, PickedColor } from '../types';

/**
 * Image enregistrée. Le stockage passe par cette interface pour pouvoir
 * remplacer IndexedDB par Firestore plus tard sans toucher à l'interface.
 */
export interface SavedImage {
  id: string;
  name: string;
  savedAt: number;
  /** Image réduite (JPEG), pour l'affichage et la pipette. */
  blob: Blob;
  categories: Category[];
  colors: PickedColor[];
}

/** Enregistrement de la première version : palette automatique et couleurs épinglées. */
interface LegacySavedImage {
  id: string;
  name: string;
  savedAt: number;
  blob: Blob;
  palette?: { hex: string; lab: PickedColor['lab']; lch: PickedColor['lch'] }[];
  pinned?: { hex: string; lab: PickedColor['lab']; lch: PickedColor['lch'] }[];
}

/**
 * Remet un enregistrement au format actuel. Les couleurs de la première version
 * sont gardées dans deux catégories, sans position sur l'image.
 */
export function normalizeSaved(raw: SavedImage | LegacySavedImage): SavedImage {
  if ('colors' in raw && Array.isArray(raw.colors)) return raw;
  const legacy = raw as LegacySavedImage;
  const categories: Category[] = [];
  const colors: PickedColor[] = [];
  const keep = (name: string, list: LegacySavedImage['palette']) => {
    if (!list?.length) return;
    const category = { id: `${legacy.id}-${categories.length}`, name };
    categories.push(category);
    list.forEach((c, i) =>
      colors.push({ id: `${category.id}-${i}`, hex: c.hex, lab: c.lab, lch: c.lch, categoryId: category.id }),
    );
  };
  keep(fr.legacyPalette, legacy.palette);
  keep(fr.legacyPinned, legacy.pinned);
  return { id: legacy.id, name: legacy.name, savedAt: legacy.savedAt, blob: legacy.blob, categories, colors };
}

/** Ce qui change pendant l'édition : sans l'image, pour ne pas la renvoyer à chaque couleur prélevée. */
export type ImageEdits = Pick<SavedImage, 'categories' | 'colors'>;

export interface ImageStore {
  list(): Promise<SavedImage[]>;
  put(image: SavedImage): Promise<void>;
  update(id: string, edits: ImageEdits): Promise<void>;
  remove(id: string): Promise<void>;
}

const DB_NAME = 'colorpalette';
const STORE = 'images';

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Stockage local dans le navigateur (IndexedDB) : rien ne quitte l'appareil. */
export function createIndexedDbStore(factory: IDBFactory = indexedDB): ImageStore {
  let db: Promise<IDBDatabase> | null = null;
  const open = () => {
    if (!db) {
      const req = factory.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE, { keyPath: 'id' });
      };
      db = request(req);
    }
    return db;
  };
  const tx = async (mode: IDBTransactionMode) => (await open()).transaction(STORE, mode).objectStore(STORE);

  return {
    async list() {
      const all = await request((await tx('readonly')).getAll() as IDBRequest<(SavedImage | LegacySavedImage)[]>);
      return all.map(normalizeSaved).sort((a, b) => b.savedAt - a.savedAt);
    },
    async put(image) {
      await request((await tx('readwrite')).put(image));
    },
    async update(id, edits) {
      const store = await tx('readwrite');
      const current = (await request(store.get(id))) as SavedImage | undefined;
      if (current) await request(store.put({ ...current, ...edits }));
    },
    async remove(id) {
      await request((await tx('readwrite')).delete(id));
    },
  };
}
