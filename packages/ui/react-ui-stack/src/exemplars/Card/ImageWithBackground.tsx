//
// Copyright 2025 DXOS.org
//

import React, { useRef, useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type ImageWithDominantBackgroundProps = ThemedClassName<{
  src: string;
  alt?: string;
  containerClassName?: string;
  fallbackColor?: string;
  crossOrigin?: 'anonymous' | 'use-credentials' | '';
}>;

// TODO(thure): This doesn’t feel quite at home in `react-ui-stack`, though it mixes Card’s layout concerns with raster image analysis.
export const ImageWithBackground = ({
  classNames,
  src,
  // TODO(thure): Images must be captioned, there is a reason `alt` is required and doesn’t default to an empty string elsewhere.
  alt = '',
  // TODO(thure): This component should export subcomponents if consumers in a React runtime need to configure multiple elements within the component.
  containerClassName = '',
  // TODO(thure): Colors should always draw from the theme, literals like this should be avoided.
  fallbackColor = '#f0f0f0',
  crossOrigin = 'anonymous',
}: ImageWithDominantBackgroundProps) => {
  const [dominantColor, setDominantColor] = useState<string>(fallbackColor);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const extractDominantColor = (img: HTMLImageElement): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to a small dimension for performance.
    const sampleSize = 64;
    canvas.width = sampleSize;
    canvas.height = sampleSize;

    // Draw the image scaled down.
    ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

    try {
      // Get image data.
      const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
      const pixels = imageData.data;

      // Calculate average color with more weight to vibrant colors.
      let r = 0,
        g = 0,
        b = 0;
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
        r = Math.round(r * 0.85);
        g = Math.round(g * 0.85);
        b = Math.round(b * 0.85);

        setDominantColor(`rgb(${r}, ${g}, ${b})`);
      }
    } catch (error) {
      console.error('Error extracting color:', error);
      setDominantColor(fallbackColor);
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>): void => {
    const img = e.target as HTMLImageElement;
    extractDominantColor(img);
    setImageLoaded(true);
  };

  const handleImageError = (): void => {
    setDominantColor(fallbackColor);
    setImageLoaded(true);
  };

  return (
    <div
      className={`relative flex is-full overflow-hidden transition-all duration-700 ${containerClassName}`}
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
          background: `radial-gradient(circle at center, transparent 30%, ${dominantColor} 100%)`,
          opacity: 0.5,
          transition: 'opacity 0.7s ease-in-out',
        }}
      />

      <img
        src={src}
        alt={alt}
        crossOrigin={crossOrigin}
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={mx('relative z-10 object-contain transition-opacity duration-500`', classNames)}
        style={{
          opacity: imageLoaded ? 1 : 0,
        }}
      />
    </div>
  );
};
