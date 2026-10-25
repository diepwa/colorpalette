import type { Bytes, Firestore } from 'firebase/firestore';
import type { Category, PickedColor } from '../types';
import { normalizeSaved, type ImageStore, type SavedImage } from './store';

/** Un document Firestore est limité à 1 Mio : l'image JPEG doit rester nettement en dessous. */
export const MAX_IMAGE_BYTES = 800 * 1024;

/** Document d'une image dans users/{uid}/images/{id}. */
export interface ImageDoc {
  name: string;
  savedAt: number;
  image: Bytes;
  categories: Category[];
  colors: PickedColor[];
}

/** Retire les champs undefined, que Firestore refuse. */
function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function toDoc(image: SavedImage, bytes: Bytes): ImageDoc {
  return {
    name: image.name,
    savedAt: image.savedAt,
    image: bytes,
    categories: clean(image.categories),
    colors: clean(image.colors),
  };
}

export function fromDoc(id: string, data: ImageDoc): SavedImage {
  return normalizeSaved({
    id,
    name: data.name,
    savedAt: data.savedAt,
    blob: new Blob([data.image.toUint8Array() as Uint8Array<ArrayBuffer>], { type: 'image/jpeg' }),
    categories: data.categories ?? [],
    colors: data.colors ?? [],
  });
}

/**
 * Réduit une image JPEG jusqu'à passer sous `maxBytes`, en baissant la qualité puis la taille.
 * `encode` reçoit une échelle (1 = taille d'origine) et une qualité JPEG.
 */
export async function fitUnder(
  maxBytes: number,
  encode: (scale: number, quality: number) => Promise<Blob>,
): Promise<Blob> {
  let last: Blob | null = null;
  for (const scale of [1, 0.8, 0.64, 0.5, 0.4]) {
    for (const quality of [0.88, 0.78, 0.68]) {
      last = await encode(scale, quality);
      if (last.size <= maxBytes) return last;
    }
  }
  throw new Error(`Image trop lourde pour Firestore (${last?.size ?? 0} octets)`);
}

async function compress(blob: Blob): Promise<Blob> {
  if (blob.size <= MAX_IMAGE_BYTES) return blob;
  const bitmap = await createImageBitmap(blob);
  try {
    return await fitUnder(MAX_IMAGE_BYTES, (scale, quality) => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encodage JPEG impossible'))), 'image/jpeg', quality),
      );
    });
  } finally {
    bitmap.close();
  }
}

/** Stockage dans Firestore, propre à l'utilisateur connecté. Les images voyagent dans le document. */
export async function createFirestoreStore(db: Firestore, uid: string): Promise<ImageStore> {
  const { Bytes, collection, deleteDoc, doc, getDocs, orderBy, query, setDoc, updateDoc } = await import('firebase/firestore');
  const images = collection(db, 'users', uid, 'images');
  return {
    async list() {
      const snap = await getDocs(query(images, orderBy('savedAt', 'desc')));
      return snap.docs.map((d) => fromDoc(d.id, d.data() as ImageDoc));
    },
    async put(image) {
      const blob = await compress(image.blob);
      const bytes = Bytes.fromUint8Array(new Uint8Array(await blob.arrayBuffer()));
      await setDoc(doc(images, image.id), toDoc(image, bytes));
    },
    async update(id, edits) {
      await updateDoc(doc(images, id), { categories: clean(edits.categories), colors: clean(edits.colors) });
    },
    async remove(id) {
      await deleteDoc(doc(images, id));
    },
  };
}
