import type { PaletteColor } from '../engine';
import type { ExtractRequest, ExtractResponse } from '../workers/extract.worker';

let worker: Worker | null = null;
const pending = new Map<string, (r: ExtractResponse) => void>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../workers/extract.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<ExtractResponse>) => {
      pending.get(event.data.id)?.(event.data);
      pending.delete(event.data.id);
    };
  }
  return worker;
}

/** Extrait la palette dans un Web Worker pour ne pas bloquer l'interface. */
export function extractInWorker(id: string, data: Uint8ClampedArray): Promise<{ palette: PaletteColor[]; ms: number }> {
  return new Promise((resolve) => {
    pending.set(id, resolve);
    // Copie : l'appelant garde ses pixels pour la pipette.
    const request: ExtractRequest = { id, data: new Uint8ClampedArray(data) };
    getWorker().postMessage(request, [request.data.buffer]);
  });
}
