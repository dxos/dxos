//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { ark } from '@ark-ui/react/factory';
import React, { useCallback, useState } from 'react';

import { createContext, useComposedRefs } from '@dxos/react-hooks';
import { type AllowedAxis } from '@dxos/ui-types';

import { composableProps, slottable } from '../../../util/slots.ts';
import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { ScrollAreaThumbs } from './ScrollAreaThumbs.tsx';
import { scrollbar } from './scrollbar.ts';

type ScrollAreaContextValue = {
  native: boolean;
  setViewport: (viewport: HTMLElement | null) => void;
};

const [ScrollAreaProvider, useScrollAreaContext] = createContext<ScrollAreaContextValue>('ScrollArea');

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

type ScrollAreaViewportProps = {};

/** The scrolling element; under `asChild` it is the child (e.g. a Container) itself. */
const ScrollAreaViewport = slottable<HTMLDivElement, ScrollAreaViewportProps>(
  ({ children, asChild, ...props }, forwardedRef) => {
    const { native, setViewport } = useScrollAreaContext('ScrollArea.Viewport');
    const ref = useComposedRefs(forwardedRef, setViewport);
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

export { ScrollAreaRoot as Root, ScrollAreaViewport as Viewport };
export type { ScrollAreaRootProps as RootProps, ScrollAreaViewportProps as ViewportProps };
