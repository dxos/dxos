//
// Copyright 2026 DXOS.org
//

// `Carousel` — slides shown one at a time, built on `@ark-ui/react`'s Carousel (zag state machine).
// The machine owns the scroll-snap track and which page it is on, the wrap-around, the auto-advance
// and its stopping the moment the reader takes over, the arrow keys, and the `region` / `slide`
// roles. DXOS owns the geometry — a three-column grid with the viewport in the middle — the media
// each slide renders, and the indicator strip's tab semantics.

import { Carousel as CarouselPrimitive, useCarouselContext } from '@ark-ui/react/carousel';
import React, { type PropsWithChildren, type ReactNode, useMemo } from 'react';

import { useFocusGroup } from '@dxos/react-focus';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { useTranslation } from '../../providers';
import { type ThemedClassName, composable, composableProps } from '../../util';
import { IconButton } from '../Button';
import { type MediaKind, MediaPlayer } from '../MediaPlayer';

//
// Root
//

export type CarouselRootProps = PropsWithChildren<{
  /** Total number of slides; drives auto-advance and indicator counts. */
  count: number;
  /**
   * Auto-advance interval in milliseconds. A positive value advances slides on its own until the user
   * interacts with a control; omit (or `0`) to disable.
   */
  autoAdvance?: number;
  defaultIndex?: number;
  /** Wrap-around in the same travel direction (last → first slides forward, first → last slides back). */
  continuous?: boolean;
}>;

const CarouselRoot = ({
  children,
  count,
  autoAdvance = 0,
  defaultIndex = 0,
  continuous = false,
}: CarouselRootProps) => {
  const { t } = useTranslation(translationKey);

  // The machine names its own controls in English; the app names them in the reader's language.
  const translations = useMemo(
    () => ({
      prevTrigger: t('carousel-prev.label'),
      nextTrigger: t('carousel-next.label'),
      indicator: (index: number) => t('carousel-go-to.label', { index: index + 1 }),
    }),
    [t],
  );

  if (count === 0) {
    return null;
  }

  return (
    <CarouselPrimitive.Root
      slideCount={count}
      defaultPage={defaultIndex}
      loop={continuous}
      autoplay={autoAdvance > 0 ? { delay: autoAdvance } : false}
      translations={translations}
      className='contents'
    >
      {children}
    </CarouselPrimitive.Root>
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

/** The scroll-snap track. The machine parks the tab stop here and answers the arrow keys on it. */
const CarouselViewport = ({ children, classNames }: CarouselViewportProps) => {
  const { t } = useTranslation(translationKey);

  return (
    <CarouselPrimitive.ItemGroup
      // TODO(burdon): Move to ui-theme.
      className={mx(
        'relative w-full aspect-video overflow-hidden',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        classNames,
      )}
      aria-label={t('carousel-viewport.label')}
    >
      {children}
    </CarouselPrimitive.ItemGroup>
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
  const { page } = useCarouselContext();

  return (
    <CarouselPrimitive.Item index={index} className={mx('relative h-full dx-base-surface', classNames)}>
      <MediaPlayer
        src={src}
        kind={kind}
        alt={alt}
        classNames='dx-fill'
        // Every slide stays in the track, so only the one on screen may play — the others would be
        // heard rather than seen.
        autoPlay={autoPlay && page === index}
        loop={loop}
        muted={muted}
        controls={controls}
        crossOrigin={crossOrigin}
      />
    </CarouselPrimitive.Item>
  );
};

CarouselSlide.displayName = 'Carousel.Slide';

//
// Previous / Next
//

export type CarouselButtonProps = ThemedClassName<{}>;

const CarouselPrevious = ({ classNames }: CarouselButtonProps) => {
  const { t } = useTranslation(translationKey);
  const { pageSnapPoints } = useCarouselContext();
  if (pageSnapPoints.length <= 1) {
    return <div />;
  }

  return (
    <CarouselPrimitive.PrevTrigger asChild>
      <IconButton
        classNames={mx('self-center', classNames)}
        square
        variant='ghost'
        icon='ph--caret-left--regular'
        iconOnly
        label={t('carousel-prev.label')}
      />
    </CarouselPrimitive.PrevTrigger>
  );
};

CarouselPrevious.displayName = 'Carousel.Previous';

const CarouselNext = ({ classNames }: CarouselButtonProps) => {
  const { t } = useTranslation(translationKey);
  const { pageSnapPoints } = useCarouselContext();
  if (pageSnapPoints.length <= 1) {
    return <div />;
  }

  return (
    <CarouselPrimitive.NextTrigger asChild>
      <IconButton
        classNames={mx('self-center', classNames)}
        square
        variant='ghost'
        icon='ph--caret-right--regular'
        iconOnly
        label={t('carousel-next.label')}
      />
    </CarouselPrimitive.NextTrigger>
  );
};

CarouselNext.displayName = 'Carousel.Next';

//
// Indicators
//

export type CarouselIndicatorsProps = ThemedClassName<{}>;

/**
 * Tab-strip of slide indicators. Sits in the centre column so it matches the viewport's width.
 *
 * Not the machine's own indicator group: that leaves every dot a tab stop and moves the page with
 * the arrows without moving focus. A strip of dots is one control, so it keeps a roving tabstop and
 * the slide follows whichever dot holds focus.
 */
const CarouselIndicators = ({ classNames }: CarouselIndicatorsProps) => {
  const { t } = useTranslation(translationKey);
  const { page, pageSnapPoints, scrollTo } = useCarouselContext();
  const { ref: focusGroupRef, ...focusGroupProps } = useFocusGroup({ axis: 'horizontal', memorizeCurrent: true });
  if (pageSnapPoints.length <= 1) {
    return null;
  }

  return (
    <div className='col-start-2 overflow-hidden'>
      <div
        {...focusGroupProps}
        className={mx('flex items-center justify-center', classNames)}
        role='tablist'
        aria-label={t('carousel-indicators.label')}
        ref={focusGroupRef}
      >
        {pageSnapPoints.map((_, index) => (
          <CarouselPrimitive.Indicator key={index} index={index} asChild>
            <IconButton
              role='tab'
              aria-selected={index === page}
              // `dx-focus-ring-none`: focusing a dot selects its slide (`onFocus` below), so the fill
              // already tracks focus — the ring on top of it is noise rather than the only indicator.
              classNames={mx('dx-focus-ring-none', index === page ? 'text-primary-500' : 'text-description')}
              variant='ghost'
              density='sm'
              size={3}
              square
              icon={index === page ? 'ph--circle--fill' : 'ph--circle--regular'}
              iconOnly
              label={t('carousel-go-to.label', { index: index + 1 })}
              onFocus={() => scrollTo(index)}
            />
          </CarouselPrimitive.Indicator>
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
  const { page } = useCarouselContext();
  const content = children(page);
  if (content == null || content === false || content === '') {
    return null;
  }

  return (
    // TODO(burdon): Move to ui-theme.
    <div className='col-start-2'>
      <p className={mx('text-center text-description tabular-nums', classNames)}>{content}</p>
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
