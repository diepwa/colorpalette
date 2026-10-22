import type { PaletteColor } from '../engine';

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
  palette: PaletteColor[];
  pinned: PaletteColor[];
}

export interface ImageStore {
  list(): Promise<SavedImage[]>;
  put(image: SavedImage): Promise<void>;
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
      const all = await request((await tx('readonly')).getAll() as IDBRequest<SavedImage[]>);
      return all.sort((a, b) => b.savedAt - a.savedAt);
    },
    async put(image) {
      await request((await tx('readwrite')).put(image));
    },
    async remove(id) {
      await request((await tx('readwrite')).delete(id));
    },
  };
}
