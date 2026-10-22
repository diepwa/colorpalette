/** Image synthétique en aplats : chaque couleur occupe la part indiquée des pixels. */
export function flatImage(regions: [string, number][], pixelCount = 10000): Uint8ClampedArray {
  const data = new Uint8ClampedArray(pixelCount * 4);
  let offset = 0;
  regions.forEach(([hex, share], idx) => {
    const n = idx === regions.length - 1 ? pixelCount - offset : Math.round(share * pixelCount);
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    for (let i = offset; i < offset + n; i++) {
      data.set([r, g, b, 255], i * 4);
    }
    offset += n;
  });
  return data;
}

/** Ajoute un bruit déterministe de ±amp sur chaque canal. */
export function addNoise(data: Uint8ClampedArray, amp: number, seed = 7): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data);
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = 0; i < out.length; i++) {
    if (i % 4 === 3) continue;
    out[i] = out[i] + Math.round((rand() * 2 - 1) * amp);
  }
  return out;
}
