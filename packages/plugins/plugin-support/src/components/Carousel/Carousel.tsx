//
// Copyright 2026 DXOS.org
//

import React, {
  createContext,
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { invariant } from '@dxos/invariant';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

//
// Context
//

type CarouselContextValue = {
  index: number;
  count: number;
  setIndex: (index: number) => void;
  next: () => void;
  prev: () => void;
};

const CarouselContext = createContext<CarouselContextValue | null>(null);

/** Returns the current carousel state. Must be used within {@link CarouselRoot}. */
export const useCarousel = (): CarouselContextValue => {
  const context = useContext(CarouselContext);
  invariant(context, 'useCarousel must be used within Carousel.Root');
  return context;
};

//
// Root
//

export type CarouselRootProps = PropsWithChildren<{
  /** Total number of slides; drives auto-advance and indicator counts. */
  count: number;
  /** Auto-advance interval in milliseconds. Set 0 to disable. */
  intervalMs?: number;
  defaultIndex?: number;
  classNames?: string;
}>;

const CarouselRoot = ({ children, count, intervalMs = 5_000, defaultIndex = 0, classNames }: CarouselRootProps) => {
  const [index, setIndexState] = useState(defaultIndex);
  const [autoAdvance, setAutoAdvance] = useState(true);

  // Reset to first slide if the slide count shrinks below the current index.
  useEffect(() => {
    if (index >= count) {
      setIndexState(0);
    }
  }, [count, index]);

  // Auto-advance — stops permanently once the user interacts with any control.
  useEffect(() => {
    if (!autoAdvance || count <= 1 || intervalMs <= 0) {
      return;
    }
    const handle = setInterval(() => setIndexState((i) => (i + 1) % count), intervalMs);
    return () => clearInterval(handle);
  }, [autoAdvance, count, intervalMs]);

  const setIndex = useCallback((next: number) => {
    setAutoAdvance(false);
    setIndexState(next);
  }, []);
  const next = useCallback(() => {
    setAutoAdvance(false);
    setIndexState((i) => (i + 1) % count);
  }, [count]);
  const prev = useCallback(() => {
    setAutoAdvance(false);
    setIndexState((i) => (i - 1 + count) % count);
  }, [count]);

  const value = useMemo(() => ({ index, count, setIndex, next, prev }), [index, count, setIndex, next, prev]);

  if (count === 0) {
    return null;
  }

  return (
    <CarouselContext.Provider value={value}>
      <div className={mx('dx-container relative flex flex-col items-center gap-2 w-full max-w-xl', classNames)}>
        {children}
      </div>
    </CarouselContext.Provider>
  );
};

CarouselRoot.displayName = 'Carousel.Root';

//
// Viewport
//

export type CarouselViewportProps = PropsWithChildren<{ classNames?: string }>;

const CarouselViewport = ({ children, classNames }: CarouselViewportProps) => {
  return (
    <div
      className={mx(
        'relative w-full aspect-video overflow-hidden rounded-md bg-baseSurface border border-separator',
        classNames,
      )}
    >
      {children}
    </div>
  );
};

CarouselViewport.displayName = 'Carousel.Viewport';

//
// Slide
//

export type CarouselSlideProps = PropsWithChildren<{
  index: number;
  classNames?: string;
}>;

const CarouselSlide = ({ children, index, classNames }: CarouselSlideProps) => {
  const { index: active } = useCarousel();
  if (active !== index) {
    return null;
  }
  return <div className={mx('absolute inset-0 w-full h-full', classNames)}>{children}</div>;
};

CarouselSlide.displayName = 'Carousel.Slide';

//
// Previous / Next
//

export type CarouselButtonProps = { classNames?: string };

const CarouselPrevious = ({ classNames }: CarouselButtonProps) => {
  const { t } = useTranslation(meta.id);
  const { count, prev } = useCarousel();
  if (count <= 1) {
    return null;
  }
  return (
    <IconButton
      classNames={mx('absolute left-1 top-1/2 -translate-y-1/2', classNames)}
      icon='ph--caret-left--regular'
      iconOnly
      label={t('carousel-prev.label')}
      onClick={prev}
      variant='ghost'
    />
  );
};

CarouselPrevious.displayName = 'Carousel.Previous';

const CarouselNext = ({ classNames }: CarouselButtonProps) => {
  const { t } = useTranslation(meta.id);
  const { count, next } = useCarousel();
  if (count <= 1) {
    return null;
  }
  return (
    <IconButton
      classNames={mx('absolute right-1 top-1/2 -translate-y-1/2', classNames)}
      icon='ph--caret-right--regular'
      iconOnly
      label={t('carousel-next.label')}
      onClick={next}
      variant='ghost'
    />
  );
};

CarouselNext.displayName = 'Carousel.Next';

//
// Indicators
//

export type CarouselIndicatorsProps = { classNames?: string };

const CarouselIndicators = ({ classNames }: CarouselIndicatorsProps) => {
  const { t } = useTranslation(meta.id);
  const { count, index, setIndex } = useCarousel();
  if (count <= 1) {
    return null;
  }
  return (
    <div className={mx('flex items-center', classNames)} role='tablist' aria-label={t('carousel-indicators.label')}>
      {Array.from({ length: count }).map((_, i) => (
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
  );
};

CarouselIndicators.displayName = 'Carousel.Indicators';

//
// Caption
//

export type CarouselCaptionProps = {
  /** Render prop receiving the active slide index. */
  children: (index: number) => ReactNode;
  classNames?: string;
};

const CarouselCaption = ({ children, classNames }: CarouselCaptionProps) => {
  const { index } = useCarousel();
  const content = children(index);
  if (content == null || content === false || content === '') {
    return null;
  }
  return <p className={mx('flex justify-center text-description', classNames)}>{content}</p>;
};

CarouselCaption.displayName = 'Carousel.Caption';

//
// Carousel
//

export const Carousel = {
  Root: CarouselRoot,
  Viewport: CarouselViewport,
  Slide: CarouselSlide,
  Previous: CarouselPrevious,
  Next: CarouselNext,
  Indicators: CarouselIndicators,
  Caption: CarouselCaption,
};
