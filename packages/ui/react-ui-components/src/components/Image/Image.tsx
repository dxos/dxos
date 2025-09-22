//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type ImageWithBackgroundProps = ThemedClassName<{
  src: string;
  alt: string;
}>;

export const ImageWithBackground = ({ classNames, src, alt }: ImageWithBackgroundProps) => {
  const [bgColor, setBgColor] = useState<string>('white');

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // needed for cross-origin images
    img.src = src;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);

      const data = ctx.getImageData(0, 0, img.width, img.height).data;
      const colorMap: Record<string, number> = {};

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const key = `${r},${g},${b}`;
        colorMap[key] = (colorMap[key] || 0) + 1;
      }

      // find the color with highest count
      const dominantColor = Object.entries(colorMap).reduce((a, b) => (b[1] > a[1] ? b : a), ['255,255,255', 0])[0];

      setBgColor(`rgb(${dominantColor})`);
    };
  }, [src]);

  return (
    <div
      className={mx(`is-full bs-full flex items-center justify-center`, classNames)}
      style={{ backgroundColor: bgColor }}
    >
      <img src={src} alt={alt} className='max-is-full max-bs-full object-contain' />
    </div>
  );
};
