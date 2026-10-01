//
// Copyright 2025 DXOS.org
//

import React, { type KeyboardEvent, type SyntheticEvent, useCallback, useState } from 'react';

import { type DominantColorOptions, sampleDominantColor } from '@dxos/lit-ui';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type ImageProps = ThemedClassName<
  {
    src: string;
    alt?: string;
    fit?: 'contain' | 'cover';
    /**
     * Image CORS mode (sets the `<img crossorigin>` attribute). Omitted by default: cross-origin
     * images load without a CORS request (no console errors), but the dominant-color sampler can't
     * read their pixels off the canvas (the browser taints it). Opt in with `'anonymous'` when the
     * image host sends CORS headers and you want the dominant-color gradient.
     */
    crossOrigin?: 'anonymous' | 'use-credentials' | '';
    /** Makes the image a button, operable by pointer and by Enter or Space. */
    onClick?: () => void;
  } & DominantColorOptions
>;

export const Image = ({
  classNames,
  src,
  alt = '',
  fit = 'contain',
  crossOrigin,
  sampleSize = 64,
  contrast = 0.9,
  onClick,
}: ImageProps) => {
  const [crossOriginState, setCrossOriginState] = useState<ImageProps['crossOrigin']>(crossOrigin);
  const [dominantColor, setDominantColor] = useState<string | undefined>(undefined);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  // CORS not supported by server.
  const handleImageError = (): void => {
    setCrossOriginState(undefined);
  };

  const handleImageLoad = useCallback(
    ({ currentTarget }: SyntheticEvent<HTMLImageElement>): void => {
      setDominantColor(sampleDominantColor(currentTarget, { sampleSize, contrast }));
      setImageLoaded(true);
    },
    [sampleSize, contrast],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLImageElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick?.();
      }
    },
    [onClick],
  );

  return (
    <div
      // `isolate` (`isolation: isolate`) creates a new stacking context so
      // the inner <img>'s `z-10` stays scoped to this wrapper. Without it
      // the z-10 leaks into the parent's stacking context and elevates the
      // image above any pseudo-element rings (e.g. Focus.Item's
      // `dx-ring-pseudo` `::after`) painted on ancestors — most visibly,
      // the focus ring on a Card containing a Card.Poster.
      className={mx(
        `isolate relative shrink-0 flex w-full justify-center overflow-hidden transition-all duration-700`,
        classNames,
      )}
      style={{
        backgroundColor: dominantColor,
      }}
    >
      {/* Background gradient overlay for smooth transition. */}
      <div
        className='dx-fullscreen pointer-events-none'
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
        className={mx(
          'z-10 transition-opacity duration-500',
          fit === 'cover' ? 'dx-fill object-cover' : 'object-contain',
        )}
        style={{
          opacity: imageLoaded ? 1 : 0,
        }}
        onError={handleImageError}
        onLoad={handleImageLoad}
        {...(onClick && { role: 'button', tabIndex: 0, onClick, onKeyDown: handleKeyDown })}
      />
    </div>
  );
};
