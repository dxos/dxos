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
  description?: string;
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
  const [autoAdvance, setAutoAdvance] = useState(true);
  const count = images.length;

  // Reset index if images shrink below current.
  useEffect(() => {
    if (index >= count) {
      setIndex(0);
    }
  }, [count, index]);

  // Auto-advance — stops permanently once the user interacts with any control.
  useEffect(() => {
    if (!autoAdvance || count <= 1 || intervalMs <= 0) {
      return;
    }
    const handle = setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => clearInterval(handle);
  }, [autoAdvance, count, intervalMs]);

  const handlePrev = useCallback(() => {
    setAutoAdvance(false);
    setIndex((i) => (i - 1 + count) % count);
  }, [count]);
  const handleNext = useCallback(() => {
    setAutoAdvance(false);
    setIndex((i) => (i + 1) % count);
  }, [count]);
  const handleSelect = useCallback((i: number) => {
    setAutoAdvance(false);
    setIndex(i);
  }, []);

  if (count === 0) {
    return null;
  }

  const current = images[index];

  return (
    <div className={mx('dx-container relative flex flex-col items-center gap-4 w-full max-w-xl', classNames)}>
      <div className='grid grid-cols-[auto_1fr_auto] w-full aspect-video overflow-hidden rounded-md bg-baseSurface border border-separator'>
        <IconButton
          classNames='absolute left-1 top-1/2 -translate-y-1/2'
          icon='ph--caret-left--regular'
          iconOnly
          label={t('carousel-prev.label')}
          onClick={handlePrev}
          variant='ghost'
        />
        <img
          key={current.src}
          src={current.src}
          alt={current.alt ?? current.description ?? ''}
          className='absolute inset-0 w-full h-full object-cover'
          loading='lazy'
        />
        <IconButton
          classNames='absolute right-1 top-1/2 -translate-y-1/2'
          icon='ph--caret-right--regular'
          iconOnly
          label={t('carousel-next.label')}
          onClick={handleNext}
          variant='ghost'
        />
      </div>
      {count > 1 && (
        <div className='flex items-center' role='tablist' aria-label={t('carousel-indicators.label')}>
          {images.map((_, i) => (
            <IconButton
              key={i}
              role='tab'
              size={3}
              variant='ghost'
              square
              aria-selected={i === index}
              classNames={['rounded-full', i === index && 'text-accent-text']}
              icon={i === index ? 'ph--circle--fill' : 'ph--circle--regular'}
              iconOnly
              label={t('carousel-go-to.label', { index: i + 1 })}
              onClick={() => handleSelect(i)}
            />
          ))}
        </div>
      )}
      {current.description && <p className='text-center text-description'>{current.description}</p>}
    </div>
  );
};
