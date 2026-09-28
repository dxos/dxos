//
// Copyright 2026 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React, { useState } from 'react';

import { createContext, useComposedRefs } from '@dxos/react-hooks';

import { ScrollAreaThumbs } from '../components/ScrollArea/ScrollAreaThumbs.tsx';
import { scrollbar } from '../components/ScrollArea/scrollbar.ts';
import { composableProps, slottable } from '../util/index.ts';
import { recipes } from './recipes.ts';
import { type Size } from './sizes.ts';

type ScrollAreaContextValue = {
  native: boolean;
  setViewport: (viewport: HTMLElement | null) => void;
};

const [ScrollAreaProvider, useScrollAreaContext] = createContext<ScrollAreaContextValue>('Next.ScrollArea');

//
// Root
//

export type ScrollAreaRootProps = {
  size?: Size;
  /** `overlay` paints the thumb over the end gutter; `reserve` takes its width out of the end track. */
  mode?: 'overlay' | 'reserve';
  /** `thin` fits the thumb in a rail Block's margin at every size; `regular` overlaps it. */
  width?: 'thin' | 'regular';
  /** Platform scrollbar instead of overlay thumbs; implies `reserve`. */
  native?: boolean;
};

/** Non-scrolling frame: hosts the overlay thumbs and is the query container for its content. */
const ScrollAreaRoot = slottable<HTMLDivElement, ScrollAreaRootProps>(
  ({ children, asChild, size, mode = 'overlay', width = 'thin', native = false, ...props }, forwardedRef) => {
    const [viewport, setViewport] = useState<HTMLElement | null>(null);
    const { className, ...rest } = composableProps(props, { classNames: recipes.scrollRoot() });
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
          className={className}
          ref={forwardedRef}
        >
          {children}
          {!native && viewport && (
            <ScrollAreaThumbs
              viewport={viewport}
              orientation='vertical'
              density={width === 'thin' ? scrollbar.md : scrollbar.lg}
              autoHide={false}
            />
          )}
        </ark.div>
      </ScrollAreaProvider>
    );
  },
);

ScrollAreaRoot.displayName = 'Next.ScrollArea.Root';

//
// Viewport
//

export type ScrollAreaViewportProps = {};

/** The scrolling element; under `asChild` it is the child (e.g. a Container) itself. */
const ScrollAreaViewport = slottable<HTMLDivElement, ScrollAreaViewportProps>(
  ({ children, asChild, ...props }, forwardedRef) => {
    const { native, setViewport } = useScrollAreaContext('Next.ScrollArea.Viewport');
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

ScrollAreaViewport.displayName = 'Next.ScrollArea.Viewport';

export const ScrollArea = {
  Root: ScrollAreaRoot,
  Viewport: ScrollAreaViewport,
};
