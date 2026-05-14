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
import { Column, IconButton, useTranslation } from '@dxos/react-ui';
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

/**
 * Wraps the carousel in a `Column.Root` 3-track grid (left gutter / content / right gutter).
 * `Carousel.Frame` slots Prev/Viewport/Next into those tracks; `Carousel.Indicators` and
 * `Carousel.Caption` live in the center track so they share the viewport's width.
 */
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
      <Column.Root gutter='lg' classNames={mx('w-full max-w-xl h-fit auto-rows-min gap-y-0', classNames)}>
        {children}
      </Column.Root>
    </CarouselContext.Provider>
  );
};

CarouselRoot.displayName = 'Carousel.Root';

//
// Frame
//

export type CarouselFrameProps = PropsWithChildren<{ classNames?: string }>;

/**
 * Bleeds across the full Column.Root grid so Previous / Viewport / Next land
 * in cols 1 / 2 / 3 respectively via Column.Row's subgrid.
 */
const CarouselFrame = ({ children, classNames }: CarouselFrameProps) => {
  return <Column.Row classNames={mx('items-center', classNames)}>{children}</Column.Row>;
};

CarouselFrame.displayName = 'Carousel.Frame';

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
      classNames={classNames}
      variant='ghost'
      icon='ph--caret-left--regular'
      iconOnly
      label={t('carousel-prev.label')}
      onClick={prev}
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
      classNames={classNames}
      variant='ghost'
      icon='ph--caret-right--regular'
      iconOnly
      label={t('carousel-next.label')}
      onClick={next}
    />
  );
};

CarouselNext.displayName = 'Carousel.Next';

//
// Indicators
//

export type CarouselIndicatorsProps = { classNames?: string };

/** Tab-strip of slide indicators. Sits in the center column so it matches the viewport's width. */
const CarouselIndicators = ({ classNames }: CarouselIndicatorsProps) => {
  const { t } = useTranslation(meta.id);
  const { count, index, setIndex } = useCarousel();
  if (count <= 1) {
    return null;
  }

  return (
    <Column.Center>
      <div
        className={mx('flex items-center justify-center', classNames)}
        role='tablist'
        aria-label={t('carousel-indicators.label')}
      >
        {Array.from({ length: count }).map((_, i) => (
          <IconButton
            key={i}
            role='tab'
            aria-selected={i === index}
            classNames={i === index ? 'text-primary-500' : 'text-description'}
            icon={i === index ? 'ph--circle--fill' : 'ph--circle--regular'}
            iconOnly
            label={t('carousel-go-to.label', { index: i + 1 })}
            onClick={() => setIndex(i)}
            size={3}
            variant='ghost'
          />
        ))}
      </div>
    </Column.Center>
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

/** Caption sized to the viewport's column. */
const CarouselCaption = ({ children, classNames }: CarouselCaptionProps) => {
  const { index } = useCarousel();
  const content = children(index);
  if (content == null || content === false || content === '') {
    return null;
  }
  return (
    <Column.Center>
      <p className={mx('text-center text-description', classNames)}>{content}</p>
    </Column.Center>
  );
};

CarouselCaption.displayName = 'Carousel.Caption';

//
// Carousel
//

export const Carousel = {
  Root: CarouselRoot,
  Frame: CarouselFrame,
  Viewport: CarouselViewport,
  Slide: CarouselSlide,
  Previous: CarouselPrevious,
  Next: CarouselNext,
  Indicators: CarouselIndicators,
  Caption: CarouselCaption,
};
