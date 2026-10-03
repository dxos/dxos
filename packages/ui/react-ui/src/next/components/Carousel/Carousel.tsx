//
// Copyright 2026 DXOS.org
//

// The zag machine owns the scroll-snap track, the page in view, wrap-around, autoplay (stopped the moment the reader
// takes over), the indicator keys and the `region`/`slide` roles; Next owns the grid around the track and the media
// each slide renders.

import { Carousel as CarouselPrimitive, useCarouselContext } from '@ark-ui/react/carousel';
import React, { type ReactNode, forwardRef, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useComposedRefs } from '@dxos/react-hooks';
import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { animationsDisabled, useReducedMotion } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { Button } from '../Button/index.ts';
import { MediaPlayer, type MediaPlayerProps } from '../MediaPlayer/index.ts';

//
// Root
//

type CarouselRootProps = ThemedClassName<
  Omit<CarouselPrimitive.RootProps, 'slideCount' | 'defaultPage' | 'loop' | 'autoplay' | 'translations' | 'orientation'>
> & {
  /** Number of slides; nothing renders without any. */
  count: number;
  /**
   * Milliseconds between automatic advances, until the reader takes over; `0` (default) never advances. Off under
   * `prefers-reduced-motion` and `VITE_DX_DISABLE_ANIMATIONS`.
   */
  autoAdvance?: number;
  defaultIndex?: number;
  /** Wrap around in the direction of travel (last to first moves forward). */
  continuous?: boolean;
};

/**
 * Ark's carousel root (`role=region`) as a three-column grid: PrevTrigger, the ItemGroup and NextTrigger share the
 * first row, and the IndicatorGroup and Caption sit under the ItemGroup's column.
 */
const CarouselRoot = forwardRef<HTMLDivElement, CarouselRootProps>(
  ({ classNames, count, autoAdvance = 0, defaultIndex = 0, continuous = false, children, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const reducedMotion = useReducedMotion();

    // The machine names its controls in English; the app names them in the reader's language.
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

    // Unattended motion the reader never asked for, which also defeats the still-frame culling of agent recordings.
    const autoplay = autoAdvance > 0 && !reducedMotion && !animationsDisabled();
    return (
      <CarouselPrimitive.Root
        aria-label={t('carousel-viewport.label')}
        {...props}
        slideCount={count}
        defaultPage={defaultIndex}
        loop={continuous}
        autoplay={autoplay ? { delay: autoAdvance } : false}
        translations={translations}
        className={mx(recipes.carousel(), classNames)}
        ref={forwardedRef}
      >
        {children}
      </CarouselPrimitive.Root>
    );
  },
);

CarouselRoot.displayName = 'Carousel.Root';

//
// ItemGroup
//

type CarouselItemGroupProps = ThemedClassName<CarouselPrimitive.ItemGroupProps>;

/** The scroll-snap track: a 16:9 frame holding one slide at a time, and a tab stop. */
const CarouselItemGroup = forwardRef<HTMLDivElement, CarouselItemGroupProps>(
  ({ classNames, ...props }, forwardedRef) => (
    <CarouselPrimitive.ItemGroup
      tabIndex={0}
      {...props}
      className={mx(recipes.carouselItemGroup(), classNames)}
      ref={forwardedRef}
    />
  ),
);

CarouselItemGroup.displayName = 'Carousel.ItemGroup';

//
// Item
//

type CarouselItemProps = ThemedClassName<Omit<CarouselPrimitive.ItemProps, 'children'>> &
  Partial<
    Pick<MediaPlayerProps, 'src' | 'kind' | 'alt' | 'controls' | 'autoPlay' | 'loop' | 'muted' | 'crossOrigin'>
  > & {
    /** Replaces the default MediaPlayer of `src`. */
    children?: ReactNode;
  };

/** One slide: a MediaPlayer of `src` by default, or its children. */
const CarouselItem = forwardRef<HTMLDivElement, CarouselItemProps>(
  (
    { classNames, index, src, kind, alt, controls, autoPlay, loop, muted, crossOrigin, children, ...props },
    forwardedRef,
  ) => {
    const { page } = useCarouselContext();
    return (
      <CarouselPrimitive.Item
        {...props}
        index={index}
        className={mx(recipes.carouselItem(), classNames)}
        ref={forwardedRef}
      >
        {children ??
          (src && (
            <MediaPlayer
              src={src}
              kind={kind}
              alt={alt}
              // Every slide stays in the track, so only the one on show may play: the others would be heard, not seen.
              autoPlay={autoPlay && page === index}
              loop={loop}
              muted={muted}
              controls={controls}
              crossOrigin={crossOrigin}
            />
          ))}
      </CarouselPrimitive.Item>
    );
  },
);

CarouselItem.displayName = 'Carousel.Item';

//
// PrevTrigger / NextTrigger
//

type CarouselTriggerProps = { label?: string };

/** A ghost icon-only Button stepping back a page; absent when everything fits on one page. */
const CarouselPrevTrigger = forwardRef<HTMLButtonElement, CarouselTriggerProps>(({ label }, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  const { pageSnapPoints } = useCarouselContext();
  if (pageSnapPoints.length <= 1) {
    return null;
  }

  return (
    <CarouselPrimitive.PrevTrigger asChild>
      <Button
        variant='ghost'
        icon='ph--caret-left--regular'
        iconOnly
        label={label ?? t('carousel-prev.label')}
        classNames={recipes.carouselPrevTrigger()}
        ref={forwardedRef}
      />
    </CarouselPrimitive.PrevTrigger>
  );
});

CarouselPrevTrigger.displayName = 'Carousel.PrevTrigger';

/** A ghost icon-only Button stepping forward a page; absent when everything fits on one page. */
const CarouselNextTrigger = forwardRef<HTMLButtonElement, CarouselTriggerProps>(({ label }, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  const { pageSnapPoints } = useCarouselContext();
  if (pageSnapPoints.length <= 1) {
    return null;
  }

  return (
    <CarouselPrimitive.NextTrigger asChild>
      <Button
        variant='ghost'
        icon='ph--caret-right--regular'
        iconOnly
        label={label ?? t('carousel-next.label')}
        classNames={recipes.carouselNextTrigger()}
        ref={forwardedRef}
      />
    </CarouselPrimitive.NextTrigger>
  );
});

CarouselNextTrigger.displayName = 'Carousel.NextTrigger';

//
// IndicatorGroup
//

type CarouselIndicatorGroupProps = ThemedClassName<Omit<CarouselPrimitive.IndicatorGroupProps, 'children'>>;

/**
 * One dot per page, as a single tab stop: only the current dot is tabbable, and when the machine's arrow, Home and End
 * keys move the page, focus follows to its dot.
 */
const CarouselIndicatorGroup = forwardRef<HTMLDivElement, CarouselIndicatorGroupProps>(
  ({ classNames, ...props }, forwardedRef) => {
    const { page, pageSnapPoints } = useCarouselContext();
    const groupRef = useRef<HTMLDivElement>(null);
    const ref = useComposedRefs(forwardedRef, groupRef);
    useEffect(() => {
      const group = groupRef.current;
      if (group && group.contains(document.activeElement)) {
        group.querySelector<HTMLElement>(`[data-part="indicator"][data-index="${page}"]`)?.focus();
      }
    }, [page]);

    if (pageSnapPoints.length <= 1) {
      return null;
    }

    return (
      <CarouselPrimitive.IndicatorGroup
        {...props}
        className={mx(recipes.carouselIndicatorGroup(), classNames)}
        ref={ref}
      >
        {pageSnapPoints.map((_, index) => (
          <CarouselPrimitive.Indicator
            key={index}
            index={index}
            tabIndex={index === page ? 0 : -1}
            className={recipes.carouselIndicator()}
          />
        ))}
      </CarouselPrimitive.IndicatorGroup>
    );
  },
);

CarouselIndicatorGroup.displayName = 'Carousel.IndicatorGroup';

//
// Caption
//

type CarouselCaptionProps = ThemedClassName<{
  /** Renders the caption of the page in view. */
  children: (page: number) => ReactNode;
}>;

/** Text under the ItemGroup's column describing the page in view; absent when there is nothing to say. */
const CarouselCaption = forwardRef<HTMLParagraphElement, CarouselCaptionProps>(
  ({ classNames, children }, forwardedRef) => {
    const { page } = useCarouselContext();
    const content = children(page);
    if (content == null || content === false || content === '') {
      return null;
    }

    return (
      <p
        data-scope='carousel'
        data-part='caption'
        className={mx(recipes.carouselCaption(), classNames)}
        ref={forwardedRef}
      >
        {content}
      </p>
    );
  },
);

CarouselCaption.displayName = 'Carousel.Caption';

export const Carousel = {
  Root: CarouselRoot,
  ItemGroup: CarouselItemGroup,
  Item: CarouselItem,
  PrevTrigger: CarouselPrevTrigger,
  NextTrigger: CarouselNextTrigger,
  IndicatorGroup: CarouselIndicatorGroup,
  Caption: CarouselCaption,
};

export type {
  CarouselCaptionProps,
  CarouselIndicatorGroupProps,
  CarouselItemGroupProps,
  CarouselItemProps,
  CarouselRootProps,
  CarouselTriggerProps,
};
