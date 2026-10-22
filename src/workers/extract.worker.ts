import { extractPalette, type PaletteColor } from '../engine';

export interface ExtractRequest {
  id: string;
  data: Uint8ClampedArray;
}

export interface ExtractResponse {
  id: string;
  palette: PaletteColor[];
  ms: number;
}

self.onmessage = (event: MessageEvent<ExtractRequest>) => {
  const { id, data } = event.data;
  const t0 = performance.now();
  const palette = extractPalette(data);
  const response: ExtractResponse = { id, palette, ms: Math.round(performance.now() - t0) };
  self.postMessage(response);
};
