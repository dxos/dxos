//
// Copyright 2025 DXOS.org
//

import React, { useRef, useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type ImageProps = ThemedClassName<{
  src: string;
  alt?: string;
  crossOrigin?: 'anonymous' | 'use-credentials' | '';
  sampleSize?: number;
  contrast?: number;
}>;

export const Image = ({
  classNames,
  src,
  alt = '',
  crossOrigin = 'anonymous',
  sampleSize = 64,
  contrast = 0.95,
}: ImageProps) => {
  const [crossOriginState, setCrossOriginState] = useState<ImageProps['crossOrigin']>(crossOrigin);
  const [dominantColor, setDominantColor] = useState<string | undefined>(undefined);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const extractDominantColor = (img: HTMLImageElement): void => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      return;
    }

    // Draw the image scaled down.
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

    try {
      // Get image data.
      const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
      const pixels = imageData.data;

      // Calculate average color with more weight to vibrant colors.
      let r = 0;
      let g = 0;
      let b = 0;
      let totalWeight = 0;
      for (let i = 0; i < pixels.length; i += 4) {
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
        const weight = 1 + saturation * 2; // Give more weight to saturated colors.

        r += red * weight;
        g += green * weight;
        b += blue * weight;
        totalWeight += weight;
      }

      if (totalWeight > 0) {
        r = Math.round(r / totalWeight);
        g = Math.round(g / totalWeight);
        b = Math.round(b / totalWeight);

        // Slightly darken the color for better contrast.
        r = Math.round(r * contrast);
        g = Math.round(g * contrast);
        b = Math.round(b * contrast);
        setDominantColor(`rgb(${r}, ${g}, ${b})`);
      }
    } catch {
      // CORS not supported by server.
      setCrossOriginState(undefined);
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>): void => {
    const img = e.target as HTMLImageElement;
    extractDominantColor(img);
    setImageLoaded(true);
  };

  const handleImageError = (): void => {
    // TODO(burdon): Error indicator.
  };

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
          background: `radial-gradient(circle at center, transparent 30%, ${dominantColor ?? ''} 100%)`,
          transition: 'opacity 0.7s ease-in-out',
          opacity: 0.5,
        }}
      />

      <img
        src={src}
        alt={alt}
        crossOrigin={crossOriginState}
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={mx('z-10 object-contain transition-opacity duration-500', classNames)}
        style={{
          opacity: imageLoaded ? 1 : 0,
        }}
      />
    </div>
  );
};
