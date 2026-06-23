//
// Copyright 2026 DXOS.org
//

import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import { createContext } from '@radix-ui/react-context';
import React, {
  Children,
  cloneElement,
  isValidElement,
  type KeyboardEvent,
  type PropsWithChildren,
  type ReactNode,
  type TransitionEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { mx } from '@dxos/ui-theme';

import { useTranslation } from '../../primitives';
import { translationKey } from '../../translations';
import { type ThemedClassName, composable, composableProps } from '../../util';
import { IconButton } from '../Button';
import { MediaPlayer, type MediaKind } from '../MediaPlayer';

// TODO(burdon): Controller.

//
// Context
//

/** Slide change behaviour: `none` hard-swaps the active slide, `slide` animates a horizontal track. */
export type CarouselTransition = 'none' | 'slide';

type CarouselContextValue = {
  index: number;
  count: number;
  transition: CarouselTransition;
  /** When `transition === 'slide'`, wrap-around advances continue in the same direction (clone + snap). */
  continuous: boolean;
  /**
   * Track position in slide units. Equals `index` except mid-wrap, when it points at a clone cell
   * (`count` = trailing clone of the first slide, `-1` = leading clone of the last) so the track keeps
   * moving in the travel direction. Settled back to the real index once the transition ends.
   */
  offset: number;
  /** Whether the track transform should animate; disabled for the instantaneous post-wrap snap. */
  animate: boolean;
  /** Snap a clone cell back to its real slide once the wrap transition completes. */
  settle: () => void;
  setIndex: (index: number) => void;
  next: () => void;
  prev: () => void;
};

const CAROUSEL_NAME = 'Carousel';

const [CarouselProvider, useCarouselContext] = createContext<CarouselContextValue>(CAROUSEL_NAME);

/** Returns the current carousel state. Must be used within {@link Carousel.Root}. */
export const useCarousel = (): CarouselContextValue => useCarouselContext('useCarousel');

//
// Root
//

export type CarouselRootProps = PropsWithChildren<{
  /** Total number of slides; drives auto-advance and indicator counts. */
  count: number;
  /** Whether to auto-advance slides on mount. Defaults to `false`. */
  autorun?: boolean;
  /** Auto-advance interval in milliseconds. Set 0 to disable. */
  intervalMs?: number;
  defaultIndex?: number;
  /** Slide change behaviour. Defaults to `none` (hard swap); `slide` animates a horizontal track. */
  transition?: CarouselTransition;
  /**
   * Wrap-around in the same travel direction (last → first slides forward, first → last slides back).
   * Only applies when `transition === 'slide'`; otherwise wrap is an instant index change.
   */
  continuous?: boolean;
}>;

const CarouselRoot = ({
  children,
  count,
  autorun = false,
  intervalMs = 5_000,
  defaultIndex = 0,
  transition = 'none',
  continuous = false,
}: CarouselRootProps) => {
  const [index, setIndexState] = useState(defaultIndex);
  const [offset, setOffset] = useState(defaultIndex);
  const [animate, setAnimate] = useState(true);
  const [autoAdvance, setAutoAdvance] = useState(autorun);

  // Continuous wrap is only meaningful for the animated track with more than one slide.
  const wraps = continuous && transition === 'slide' && count > 1;

  // Latest index without re-creating the advance/auto-advance callbacks on every change.
  const indexRef = useRef(index);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  // Reset to first slide if the slide count shrinks below the current index.
  useEffect(() => {
    if (index >= count) {
      setIndexState(0);
      setOffset(0);
    }
  }, [count, index]);

  // Step one slide in `delta` direction. `stopAuto` halts auto-advance on user interaction. In wrap
  // mode an edge step targets a clone cell (offset `count` / `-1`) so the track travels in `delta`'s
  // direction; `settle` snaps it back to the real index after the transition.
  const advance = useCallback(
    (delta: 1 | -1, stopAuto: boolean) => {
      if (stopAuto) {
        setAutoAdvance(false);
      }
      const current = indexRef.current;
      const nextIndex = (current + delta + count) % count;
      setAnimate(true);
      if (wraps && delta === 1 && current === count - 1) {
        setOffset(count);
      } else if (wraps && delta === -1 && current === 0) {
        setOffset(-1);
      } else {
        setOffset(nextIndex);
      }
      setIndexState(nextIndex);
    },
    [count, wraps],
  );

  // Auto-advance — stops permanently once the user interacts with any control.
  useEffect(() => {
    if (!autoAdvance || count <= 1 || intervalMs <= 0) {
      return;
    }
    const handle = setInterval(() => advance(1, false), intervalMs);
    return () => clearInterval(handle);
  }, [autoAdvance, count, intervalMs, advance]);

  const setIndex = useCallback((next: number) => {
    setAutoAdvance(false);
    setAnimate(true);
    setOffset(next);
    setIndexState(next);
  }, []);
  const next = useCallback(() => advance(1, true), [advance]);
  const prev = useCallback(() => advance(-1, true), [advance]);

  // Once the wrap transition lands on a clone, jump (without animating) to the matching real slide.
  const settle = useCallback(() => {
    if (offset === count) {
      setAnimate(false);
      setOffset(0);
    } else if (offset === -1) {
      setAnimate(false);
      setOffset(count - 1);
    }
  }, [offset, count]);

  if (count === 0) {
    return null;
  }

  return (
    <CarouselProvider
      index={index}
      count={count}
      transition={transition}
      continuous={wraps}
      offset={offset}
      animate={animate}
      settle={settle}
      setIndex={setIndex}
      next={next}
      prev={prev}
    >
      {children}
    </CarouselProvider>
  );
};

CarouselRoot.displayName = 'Carousel.Root';

//
// Content
//

export type CarouselContentProps = ThemedClassName<PropsWithChildren<{}>>;

const CarouselContent = composable<HTMLDivElement>(({ children, ...props }, forwardedRef) => (
  // Rows are `[1fr, auto]`: row 1 (Previous|Viewport|Next) stretches when the parent
  // gives the carousel a definite height, and row 2 (Indicators / Caption) sticks to
  // its content height. With no parent height constraint, the `1fr` row simply tracks
  // row-1 content — preserving the existing aspect-video behaviour for unbounded use.
  // TODO(burdon): Move to Carousel.theme.ts
  <div
    {...composableProps(props, {
      classNames:
        'w-full grid grid-cols-[min-content_1fr_min-content] grid-rows-[minmax(0,1fr)_auto] gap-4 items-center',
    })}
    ref={forwardedRef}
  >
    {children}
  </div>
));

CarouselContent.displayName = 'Carousel.Content';

//
// Viewport
//

export type CarouselViewportProps = ThemedClassName<PropsWithChildren<{}>>;

const CarouselViewport = ({ children, classNames }: CarouselViewportProps) => {
  const { t } = useTranslation(translationKey);
  const { count, transition, continuous, offset, animate, settle, next, prev } = useCarousel();

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

  // In continuous mode bracket the track with clones — last before first, first after last — so a wrap
  // step has a real cell to slide into before `settle` snaps back to the matching slide.
  const slides = Children.toArray(children);
  const trackChildren =
    continuous && slides.length > 1
      ? [
          isValidElement(slides[slides.length - 1])
            ? cloneElement(slides[slides.length - 1], { key: 'clone-last' })
            : slides[slides.length - 1],
          ...slides,
          isValidElement(slides[0]) ? cloneElement(slides[0], { key: 'clone-first' }) : slides[0],
        ]
      : slides;
  // Leading clone occupies the first cell in continuous mode, so shift the translate by one.
  const translate = continuous ? -(offset + 1) * 100 : -offset * 100;

  const handleTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget && event.propertyName === 'transform') {
        settle();
      }
    },
    [settle],
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
      {transition === 'slide' ? (
        // Lay slides side-by-side in a flex track and translate by the active index. Each slide
        // sizes itself to the viewport via `shrink-0 basis-full` (see `Carousel.Slide`).
        // `motion-reduce` respects the user's reduced-motion preference; the snap after a wrap also
        // disables the transition (`animate === false`).
        <div
          className={mx(
            'flex h-full motion-reduce:transition-none',
            animate ? 'transition-transform duration-300 ease-out' : 'transition-none',
          )}
          style={{ transform: `translateX(${translate}%)` }}
          onTransitionEnd={handleTransitionEnd}
        >
          {trackChildren}
        </div>
      ) : (
        children
      )}
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
  const { index: active, transition } = useCarousel();
  // In `slide` mode every slide stays mounted as a fixed-width track cell so the track can animate;
  // in `none` mode only the active slide mounts, overlaid via absolute positioning.
  if (transition !== 'slide' && active !== index) {
    return null;
  }

  return (
    <div
      className={mx(
        transition === 'slide'
          ? 'relative shrink-0 basis-full h-full bg-baseSurface'
          : 'absolute inset-0 w-full h-full bg-baseSurface',
        classNames,
      )}
    >
      <MediaPlayer
        src={src}
        kind={kind}
        alt={alt}
        classNames='w-full h-full'
        controls={controls}
        // In `slide` mode every slide is mounted; only auto-play the active one to avoid off-screen playback.
        autoPlay={autoPlay && active === index}
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
            classNames={mx(i === index ? 'text-primary-500' : 'text-description')}
            variant='ghost'
            density='sm'
            size={3}
            square
            icon={i === index ? 'ph--circle--fill' : 'ph--circle--regular'}
            iconOnly
            label={t('carousel-go-to.label', { index: i + 1 })}
            onClick={() => setIndex(i)}
            onFocus={() => setIndex(i)}
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
  Content: CarouselContent,
  Viewport: CarouselViewport,
  Slide: CarouselSlide,
  Previous: CarouselPrevious,
  Next: CarouselNext,
  Indicators: CarouselIndicators,
  Caption: CarouselCaption,
};
