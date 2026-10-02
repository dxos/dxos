//
// Copyright 2025 DXOS.org
//

export type DominantColorOptions = {
  /** Side of the square the image is scaled down to before sampling. */
  sampleSize?: number;
  /** Multiplier applied to each channel, darkening the colour slightly for contrast with the image. */
  contrast?: number;
};

/** Images a long-lived page shows are unbounded, so the oldest sample is dropped past this many. */
const CACHE_LIMIT = 256;

const cache = new Map<string, string | undefined>();

const remember = (key: string, color: string | undefined) => {
  cache.set(key, color);
  if (cache.size > CACHE_LIMIT) {
    const [oldest] = cache.keys();
    cache.delete(oldest);
  }
};

/**
 * The dominant colour of a loaded image's corners as `rgb(r, g, b)`, weighted towards saturated pixels, for a letterbox
 * or backdrop behind it. `undefined` when the image is transparent at its edges or its pixels cannot be read (a
 * cross-origin image loaded without CORS taints the canvas), so callers fall back to their surface colour.
 */
export const sampleDominantColor = (
  img: HTMLImageElement,
  { sampleSize = 64, contrast = 0.95 }: DominantColorOptions = {},
): string | undefined => {
  const key = `${img.currentSrc || img.src} ${sampleSize} ${contrast}`;
  if (cache.has(key)) {
    return cache.get(key);
  }

  const canvas = img.ownerDocument.createElement('canvas');
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return undefined;
  }

  ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
  let pixels: Uint8ClampedArray;
  try {
    pixels = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'SecurityError') {
      remember(key, undefined);
      return undefined;
    }
    throw err;
  }

  const color = isTransparent(pixels, sampleSize) ? undefined : cornerColor(pixels, sampleSize, contrast);
  remember(key, color);
  return color;
};

const cornerColor = (pixels: Uint8ClampedArray, sampleSize: number, contrast: number): string | undefined => {
  const cornerSize = Math.floor(sampleSize * 0.125);
  let red = 0;
  let green = 0;
  let blue = 0;
  let totalWeight = 0;
  for (let y = 0; y < sampleSize; y++) {
    for (let x = 0; x < sampleSize; x++) {
      const inColumn = x < cornerSize || x >= sampleSize - cornerSize;
      const inRow = y < cornerSize || y >= sampleSize - cornerSize;
      if (!inColumn || !inRow) {
        continue;
      }

      const index = (y * sampleSize + x) * 4;
      if (pixels[index + 3] === 0) {
        continue;
      }

      const [r, g, b] = [pixels[index], pixels[index + 1], pixels[index + 2]];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const weight = 1 + (max === 0 ? 0 : (max - min) / max) * 2;
      red += r * weight;
      green += g * weight;
      blue += b * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) {
    return undefined;
  }

  const channel = (sum: number) => Math.round(Math.round(sum / totalWeight) * contrast);
  return `rgb(${channel(red)}, ${channel(green)}, ${channel(blue)})`;
};

/** Whether more than `threshold` of the edge pixels are fully transparent (a cut-out on no background). */
const isTransparent = (pixels: Uint8ClampedArray, sampleSize: number, threshold = 0.5): boolean => {
  let transparent = 0;
  const edgePixels = sampleSize * 4 - 4;
  const alpha = (x: number, y: number) => pixels[(y * sampleSize + x) * 4 + 3];
  for (let x = 0; x < sampleSize; x++) {
    transparent += (alpha(x, 0) === 0 ? 1 : 0) + (alpha(x, sampleSize - 1) === 0 ? 1 : 0);
  }
  for (let y = 1; y < sampleSize - 1; y++) {
    transparent += (alpha(0, y) === 0 ? 1 : 0) + (alpha(sampleSize - 1, y) === 0 ? 1 : 0);
  }

  return transparent / edgePixels > threshold;
};
