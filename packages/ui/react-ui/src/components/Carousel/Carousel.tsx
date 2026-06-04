//
// Copyright 2026 DXOS.org
//

import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import React, {
  createContext,
  type KeyboardEvent,
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { mx } from '@dxos/ui-theme';

import { useTranslation } from '../../primitives';
import { translationKey } from '../../translations';
import { type ThemedClassName } from '../../util';
import { IconButton } from '../Button';
import { MediaPlayer, type MediaKind } from '../MediaPlayer';

// TODO(burdon): Move per-element class strings to `@dxos/ui-theme` (theme tokens)
// so callers can re-theme via the same mechanism the rest of `react-ui` uses.

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

/** Returns the current carousel state. Must be used within {@link Carousel.Root}. */
export const useCarousel = (): CarouselContextValue => {
  const context = useContext(CarouselContext);
  if (!context) {
    throw new Error('useCarousel must be used within Carousel.Root');
  }
  return context;
};

//
// Root
//

export type CarouselRootProps = ThemedClassName<
  PropsWithChildren<{
    /** Total number of slides; drives auto-advance and indicator counts. */
    count: number;
    /** Whether to auto-advance slides on mount. Defaults to `false`. */
    autorun?: boolean;
    /** Auto-advance interval in milliseconds. Set 0 to disable. */
    intervalMs?: number;
    defaultIndex?: number;
  }>
>;

const CarouselRoot = ({
  classNames,
  children,
  count,
  autorun = false,
  intervalMs = 5_000,
  defaultIndex = 0,
}: CarouselRootProps) => {
  const [index, setIndexState] = useState(defaultIndex);
  const [autoAdvance, setAutoAdvance] = useState(autorun);

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
      {/*
       * Rows are `[1fr, auto]`: row 1 (Previous|Viewport|Next) stretches when the parent
       * gives the carousel a definite height, and row 2 (Indicators / Caption) sticks to
       * its content height. With no parent height constraint, the `1fr` row simply tracks
       * row-1 content — preserving the existing aspect-video behaviour for unbounded use.
       */}
      {/* TODO(burdon): Move to Carousel.theme.ts */}
      <div
        className={mx(
          'w-full grid grid-cols-[min-content_1fr_min-content] grid-rows-[minmax(0,1fr)_auto] gap-4 items-center',
          classNames,
        )}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
};

CarouselRoot.displayName = 'Carousel.Root';

//
// Viewport
//

export type CarouselViewportProps = ThemedClassName<PropsWithChildren<{}>>;

const CarouselViewport = ({ children, classNames }: CarouselViewportProps) => {
  const { t } = useTranslation(translationKey);
  const { count, next, prev } = useCarousel();
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (count <= 1) {
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        prev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        next();
      }
    },
    [count, next, prev],
  );

  return (
    <div
      // TODO(burdon): Move to ui-theme.
      className={mx(
        'relative w-full aspect-video overflow-hidden',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        classNames,
      )}
      tabIndex={0}
      role='region'
      aria-roledescription='carousel'
      aria-label={t('carousel-viewport.label')}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
};

CarouselViewport.displayName = 'Carousel.Viewport';

//
// Slide
//

export type CarouselSlideProps = ThemedClassName<{
  index: number;
  /** Media source URL — rendered via the embedded {@link MediaPlayer}. */
  src: string;
  /** Override media auto-detection (`'video' | 'audio'`). */
  kind?: MediaKind;
  /** Accessible label / `<img alt>` fallback. */
  alt?: string;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  crossOrigin?: 'anonymous' | 'use-credentials' | '';
}>;

const CarouselSlide = ({
  index,
  classNames,
  src,
  kind,
  alt,
  controls,
  autoPlay,
  loop,
  muted,
  crossOrigin,
}: CarouselSlideProps) => {
  const { index: active } = useCarousel();
  if (active !== index) {
    return null;
  }

  return (
    <div className={mx('absolute inset-0 w-full h-full bg-baseSurface', classNames)}>
      <MediaPlayer
        src={src}
        kind={kind}
        alt={alt}
        classNames='w-full h-full'
        controls={controls}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        crossOrigin={crossOrigin}
      />
    </div>
  );
};

CarouselSlide.displayName = 'Carousel.Slide';

//
// Previous / Next
//

export type CarouselButtonProps = ThemedClassName<{}>;

const CarouselPrevious = ({ classNames }: CarouselButtonProps) => {
  const { t } = useTranslation(translationKey);
  const { count, prev } = useCarousel();
  if (count <= 1) {
    return <div />;
  }

  return (
    <IconButton
      classNames={mx('self-center', classNames)}
      square
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
  const { t } = useTranslation(translationKey);
  const { count, next } = useCarousel();
  if (count <= 1) {
    return <div />;
  }

  return (
    <IconButton
      classNames={mx('self-center', classNames)}
      square
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

export type CarouselIndicatorsProps = ThemedClassName<{}>;

/** Tab-strip of slide indicators. Sits in the centre column so it matches the viewport's width. */
const CarouselIndicators = ({ classNames }: CarouselIndicatorsProps) => {
  const { t } = useTranslation(translationKey);
  const { count, index, setIndex } = useCarousel();
  const arrowNavigationAttrs = useArrowNavigationGroup({ axis: 'horizontal', memorizeCurrent: true });
  if (count <= 1) {
    return null;
  }

  return (
    <div className='col-start-2 overflow-hidden'>
      <div
        {...arrowNavigationAttrs}
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
            onFocus={() => setIndex(i)}
            size={3}
            variant='ghost'
          />
        ))}
      </div>
    </div>
  );
};

CarouselIndicators.displayName = 'Carousel.Indicators';

//
// Caption
//

export type CarouselCaptionProps = ThemedClassName<{
  /** Render prop receiving the active slide index. */
  children: (index: number) => ReactNode;
}>;

/** Caption sized to the viewport's column. */
const CarouselCaption = ({ children, classNames }: CarouselCaptionProps) => {
  const { index } = useCarousel();
  const content = children(index);
  if (content == null || content === false || content === '') {
    return null;
  }
  return (
    // TODO(burdon): Move to ui-theme.
    <div className='col-start-2'>
      <p className={mx('text-center text-description', classNames)}>{content}</p>
    </div>
  );
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
