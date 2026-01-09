//
// Copyright 2025 DXOS.org
//

import React, { type SyntheticEvent, useCallback, useRef, useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

const cache = new Map<string, string>();

export type ImageProps = ThemedClassName<
  {
    src: string;
    alt?: string;
    crossOrigin?: 'anonymous' | 'use-credentials' | '';
  } & ColorOptions
>;

export const Image = ({
  classNames,
  src,
  alt = '',
  crossOrigin = 'anonymous',
  sampleSize = 64,
  contrast = 0.9,
}: ImageProps) => {
  const [crossOriginState, setCrossOriginState] = useState<ImageProps['crossOrigin']>(crossOrigin);
  const [dominantColor, setDominantColor] = useState<string | undefined>(undefined);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // CORS not supported by server.
  const handleImageError = (): void => {
    setCrossOriginState(undefined);
  };

  const handleImageLoad = useCallback(
    ({ target }: SyntheticEvent<HTMLImageElement>): void => {
      const rgb = cache.get(src);
      if (rgb) {
        setDominantColor(rgb);
        setImageLoaded(true);
        return;
      }

      const img = target as HTMLImageElement;
      if (!canvasRef.current) {
        return;
      }

      try {
        const color = extractDominantColor(canvasRef.current, img, { sampleSize, contrast });
        if (color) {
          const rgb = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
          cache.set(src, rgb);
          setDominantColor(rgb);
        }
      } catch {
        setCrossOriginState(undefined);
      }

      setImageLoaded(true);
    },
    [sampleSize, contrast, src],
  );

  return (
    <div
      className={mx(`relative flex is-full justify-center overflow-hidden transition-all duration-700`, classNames)}
      style={{
        backgroundColor: dominantColor,
      }}
    >
      {/* Hidden canvas for color extraction. */}
      <canvas ref={canvasRef} style={{ display: 'none' }} aria-hidden='true' />

      {/* Background gradient overlay for smooth transition. */}
      <div
        className='absolute inset-0 pointer-events-none'
        style={{
          background: dominantColor
            ? `radial-gradient(circle at center, transparent 30%, ${dominantColor} 100%)`
            : undefined,
          transition: 'opacity 0.7s ease-in-out',
          opacity: 0.5,
        }}
      />

      <img
        src={src}
        alt={alt}
        crossOrigin={crossOriginState}
        onError={handleImageError}
        onLoad={handleImageLoad}
        className={mx('z-10 object-contain transition-opacity duration-500', classNames)}
        style={{
          opacity: imageLoaded ? 1 : 0,
        }}
      />
    </div>
  );
};

type ColorOptions = {
  sampleSize?: number;
  contrast?: number;
};

/**
 * Get dominant color from image (esp. from corners).
 */
const extractDominantColor = (
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  { sampleSize = 64, contrast = 0.95 }: ColorOptions,
): [number, number, number] | null => {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  // Draw the image scaled down.
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

  // Get image data.
  const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
  const pixels = imageData.data;

  // Check for transparent background.
  if (isTransparent(pixels, sampleSize)) {
    return null;
  }

  let r = 0;
  let g = 0;
  let b = 0;
  let totalWeight = 0;

  // Define corner sampling areas (e.g., 25% of each dimension from each corner).
  const cornerSize = Math.floor(sampleSize * 0.125);

  // Sample only pixels in corner areas.
  for (let y = 0; y < sampleSize; y++) {
    for (let x = 0; x < sampleSize; x++) {
      // Check if pixel is in any corner area.
      const isInTopLeft = x < cornerSize && y < cornerSize;
      const isInTopRight = x >= sampleSize - cornerSize && y < cornerSize;
      const isInBottomLeft = x < cornerSize && y >= sampleSize - cornerSize;
      const isInBottomRight = x >= sampleSize - cornerSize && y >= sampleSize - cornerSize;
      if (!isInTopLeft && !isInTopRight && !isInBottomLeft && !isInBottomRight) {
        continue; // Skip pixels not in corner areas.
      }

      const i = (y * sampleSize + x) * 4;
      const red = pixels[i];
      const green = pixels[i + 1];
      const blue = pixels[i + 2];
      const alpha = pixels[i + 3];

      // Skip transparent pixels.
      if (alpha === 0) continue;

      // Calculate saturation to weight vibrant colors more.
      const max = Math.max(red, green, blue);
      const min = Math.min(red, green, blue);
      const saturation = max === 0 ? 0 : (max - min) / max;
      const weight = 1 + saturation * 2;

      r += red * weight;
      g += green * weight;
      b += blue * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight > 0) {
    // Slightly darken the color for better contrast.
    r = Math.round(Math.round(r / totalWeight) * contrast);
    g = Math.round(Math.round(g / totalWeight) * contrast);
    b = Math.round(Math.round(b / totalWeight) * contrast);
    return [r, g, b];
  }

  return null;
};

/**
 * Detects if an image has a transparent background by examining edge pixels.
 * @param pixels - Image pixel data from canvas
 * @param sampleSize - Size of the sampled image
 * @param threshold - Percentage threshold for considering background transparent (default: 0.5)
 * @returns True if the image has a transparent background
 */
const isTransparent = (pixels: Uint8ClampedArray, sampleSize: number, threshold: number = 0.5): boolean => {
  let edgeTransparentPixels = 0;
  const edgePixels = sampleSize * 4 - 4; // Perimeter minus corners counted twice.

  for (let x = 0; x < sampleSize; x++) {
    // Top edge.
    const topIndex = x * 4;
    if (pixels[topIndex + 3] === 0) edgeTransparentPixels++;

    // Bottom edge.
    const bottomIndex = ((sampleSize - 1) * sampleSize + x) * 4;
    if (pixels[bottomIndex + 3] === 0) edgeTransparentPixels++;
  }

  for (let y = 1; y < sampleSize - 1; y++) {
    // Left edge.
    const leftIndex = y * sampleSize * 4;
    if (pixels[leftIndex + 3] === 0) edgeTransparentPixels++;

    // Right edge.
    const rightIndex = (y * sampleSize + sampleSize - 1) * 4;
    if (pixels[rightIndex + 3] === 0) edgeTransparentPixels++;
  }

  return edgeTransparentPixels / edgePixels > threshold;
};
