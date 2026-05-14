//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { IconButton, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

export type CarouselImage = {
  src: string;
  alt?: string;
  label?: string;
};

export type CarouselProps = {
  images: CarouselImage[];
  /** Auto-advance interval in milliseconds. Set 0 to disable. */
  intervalMs?: number;
  classNames?: string;
};

/**
 * Cycles through images with optional auto-advance and manual prev/next controls.
 */
export const Carousel = ({ images, intervalMs = 5_000, classNames }: CarouselProps) => {
  const { t } = useTranslation(meta.id);
  const [index, setIndex] = useState(0);
  const count = images.length;

  // Reset index if images shrink below current.
  useEffect(() => {
    if (index >= count) {
      setIndex(0);
    }
  }, [count, index]);

  // Auto-advance.
  useEffect(() => {
    if (count <= 1 || intervalMs <= 0) {
      return;
    }
    const handle = setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => clearInterval(handle);
  }, [count, intervalMs]);

  const handlePrev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);
  const handleNext = useCallback(() => setIndex((i) => (i + 1) % count), [count]);

  if (count === 0) {
    return null;
  }

  const current = images[index];

  return (
    <div
      className={mx(
        'dx-container relative flex flex-col justify-center items-center gap-2 w-full max-w-xl',
        classNames,
      )}
    >
      <div className='relative w-full aspect-video overflow-hidden rounded-md bg-baseSurface border border-separator'>
        <img
          key={current.src}
          src={current.src}
          alt={current.alt ?? current.label ?? ''}
          className='absolute inset-0 w-full h-full object-cover'
          loading='lazy'
        />
        {count > 1 && (
          <>
            <IconButton
              classNames='absolute left-1 top-1/2 -translate-y-1/2'
              icon='ph--caret-left--regular'
              iconOnly
              label={t('carousel-prev.label')}
              onClick={handlePrev}
              variant='ghost'
            />
            <IconButton
              classNames='absolute right-1 top-1/2 -translate-y-1/2'
              icon='ph--caret-right--regular'
              iconOnly
              label={t('carousel-next.label')}
              onClick={handleNext}
              variant='ghost'
            />
          </>
        )}
      </div>
      {current.label && <div className='flex justify-center text-description'>{current.label}</div>}
      {count > 1 && (
        <div className='flex items-center' role='tablist' aria-label={t('carousel-indicators.label')}>
          {images.map((_, i) => (
            <IconButton
              key={i}
              role='tab'
              aria-selected={i === index}
              icon={i === index ? 'ph--circle--fill' : 'ph--circle--regular'}
              iconOnly
              label={t('carousel-go-to.label', { index: i + 1 })}
              onClick={() => setIndex(i)}
              size={3}
              variant='ghost'
            />
          ))}
        </div>
      )}
    </div>
  );
};
