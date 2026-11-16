//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { ark } from '@ark-ui/react/factory';
import React, {
  type PropsWithChildren,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { createContext, useComposedRefs } from '@dxos/react-hooks';
import { type AllowedAxis } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { composableProps, slottable } from '../../util/slots.ts';
import { type ScrollPosition } from './position.ts';
import { ScrollAreaThumbs } from './ScrollAreaThumbs.tsx';
import { scrollbar } from './scrollbar.ts';
import { MAIN_AREA, ScrollTracker, type ScrollTrackerOptions } from './tracker.ts';

type ScrollAreaContextValue = {
  native: boolean;
  setViewport: (viewport: HTMLElement | null) => void;
};

const [ScrollAreaProvider, useScrollAreaContext] = createContext<ScrollAreaContextValue>('ScrollArea');

type ScrollTrackingContextValue = { tracker?: ScrollTracker };

const [ScrollTrackingProvider, useScrollTrackingContext] = createContext<ScrollTrackingContextValue>(
  'ScrollTracking',
  {},
);

//
// Tracking
//

type ScrollAreaTrackingProps = PropsWithChildren<ScrollTrackerOptions>;

type ScrollAreaTrackingHandle = {
  /** Restores `position` in the area tracked under `name`. */
  restore: (name: string, position: ScrollPosition) => void;
};

/**
 * Keeps the scroll position of the areas inside it: the outermost `Viewport` as the main area, and each `Viewport`
 * given a `follow` name under that name. It renders a `display: contents` element, so it does not change the layout.
 */
const ScrollAreaTracking = forwardRef<ScrollAreaTrackingHandle, ScrollAreaTrackingProps>(
  ({ children, ...options }, forwardedRef) => {
    const optionsRef = useRef(options);
    optionsRef.current = options;
    const tracker = useMemo(() => new ScrollTracker(() => optionsRef.current), []);
    const setRoot = useCallback((element: HTMLElement | null) => tracker.setRoot(element), [tracker]);
    useEffect(() => () => tracker.dispose(), [tracker]);
    useImperativeHandle(forwardedRef, () => ({ restore: (name, position) => tracker.restore(name, position) }), [
      tracker,
    ]);
    return (
      <ScrollTrackingProvider tracker={tracker}>
        <div className='contents' ref={setRoot}>
          {children}
        </div>
      </ScrollTrackingProvider>
    );
  },
);

ScrollAreaTracking.displayName = 'ScrollArea.Tracking';

//
// Root
//

type ScrollAreaRootProps = {
  size?: Size;
  /** `overlay` paints the thumb over the end gutter; `reserve` takes its width out of the end track. */
  mode?: 'overlay' | 'reserve';
  /** `thin` fits the thumb in a rail Block's margin at every size; `regular` overlaps it. */
  width?: 'thin' | 'regular';
  /** Platform scrollbar instead of overlay thumbs; implies `reserve`. */
  native?: boolean;
  /** Scrolling axis; `all` scrolls both (the current ScrollArea's values). */
  orientation?: AllowedAxis;
  /** Overlay thumbs show only while the pointer is over the frame (or a thumb is dragged); `false` keeps them visible. */
  autoHide?: boolean;
  /** Mandatory snapping on the scrolling axis; children carry their own `scroll-snap-align`. */
  snap?: boolean;
  /** `false` scrolls without any visible bar, overlay or native. */
  scrollbars?: boolean;
  /** Pixels at the start of the horizontal bar's track left clear, so the bar spans only what scrolls past a sticky column. */
  trackStart?: number;
};

/** Tailwind group names the overlay thumbs' `autoHide` hover rule targets (`ScrollAreaThumbs`). */
const AUTO_HIDE_GROUP: Record<AllowedAxis, string> = {
  vertical: 'group/scroll-v',
  horizontal: 'group/scroll-h',
  all: 'group/scroll-all',
};

/** Non-scrolling frame: hosts the overlay thumbs and is the query container for its content. */
const ScrollAreaRoot = slottable<HTMLDivElement, ScrollAreaRootProps>(
  (
    {
      children,
      asChild,
      size,
      mode = 'overlay',
      width = 'thin',
      native = false,
      orientation = 'vertical',
      autoHide = true,
      snap = false,
      scrollbars = true,
      trackStart,
      ...props
    },
    forwardedRef,
  ) => {
    const [viewport, setViewport] = useState<HTMLElement | null>(null);
    // Which axes currently show an overlay thumb, published as `data-overflow-*` so CSS can reserve its strip.
    const [overflow, setOverflow] = useState({ vertical: false, horizontal: false });
    const handleOverflowChange = useCallback(
      (next: { vertical: boolean; horizontal: boolean }) =>
        setOverflow((current) =>
          current.vertical === next.vertical && current.horizontal === next.horizontal ? current : next,
        ),
      [],
    );
    const { className, ...rest } = composableProps(props, {
      classNames: [recipes.scrollRoot(), autoHide && AUTO_HIDE_GROUP[orientation]],
    });
    return (
      <ScrollAreaProvider native={native} setViewport={setViewport}>
        <ark.div
          asChild={asChild}
          {...rest}
          data-scope='scroll-area'
          data-part='root'
          data-size={size}
          data-mode={native ? 'reserve' : mode}
          data-width={width}
          data-orientation={orientation}
          data-snap={snap ? '' : undefined}
          data-scrollbars={scrollbars ? undefined : 'false'}
          data-overflow-y={overflow.vertical ? '' : undefined}
          data-overflow-x={overflow.horizontal ? '' : undefined}
          className={className}
          ref={forwardedRef}
        >
          {children}
          {!native && scrollbars && viewport && (
            <ScrollAreaThumbs
              viewport={viewport}
              orientation={orientation}
              density={width === 'thin' ? scrollbar.md : scrollbar.lg}
              autoHide={autoHide}
              trackStart={trackStart}
              onOverflowChange={handleOverflowChange}
            />
          )}
        </ark.div>
      </ScrollAreaProvider>
    );
  },
);

ScrollAreaRoot.displayName = 'ScrollArea.Root';

//
// Viewport
//

type ScrollAreaViewportProps = {
  /**
   * Whether a `Tracking` ancestor keeps this area's scroll position: the outermost area is kept by default, `false` opts
   * out, and a name keeps an inner area under that name.
   */
  follow?: boolean | string;
};

/** The scrolling element; under `asChild` it is the child (e.g. a Container) itself. */
const ScrollAreaViewport = slottable<HTMLDivElement, ScrollAreaViewportProps>(
  ({ children, asChild, follow = true, ...props }, forwardedRef) => {
    const { native, setViewport } = useScrollAreaContext('ScrollArea.Viewport');
    const { tracker } = useScrollTrackingContext('ScrollArea.Viewport');
    const [element, setElement] = useState<HTMLElement | null>(null);
    const ref = useComposedRefs(forwardedRef, setViewport, setElement);
    useEffect(() => {
      if (tracker && element && follow !== false) {
        return tracker.register(element, typeof follow === 'string' ? follow : undefined);
      }
    }, [tracker, element, follow]);
    const { className, ...rest } = composableProps(props, { classNames: recipes.scrollViewport() });
    return (
      <ark.div
        asChild={asChild}
        {...rest}
        data-scope='scroll-area'
        data-part='viewport'
        data-native={native ? '' : undefined}
        className={className}
        ref={ref}
      >
        {children}
      </ark.div>
    );
  },
);

ScrollAreaViewport.displayName = 'ScrollArea.Viewport';

export { ScrollAreaRoot as Root, ScrollAreaViewport as Viewport, ScrollAreaTracking as Tracking, MAIN_AREA };
export type {
  ScrollAreaRootProps as RootProps,
  ScrollAreaViewportProps as ViewportProps,
  ScrollAreaTrackingProps as TrackingProps,
  ScrollAreaTrackingHandle as TrackingHandle,
  ScrollPosition,
};
export { SCROLL_ANCHOR_ATTRIBUTE, captureScrollPosition, applyScrollPosition } from './position.ts';
