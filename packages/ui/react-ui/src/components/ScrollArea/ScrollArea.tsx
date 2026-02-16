//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type HTMLAttributes, type PropsWithChildren, forwardRef } from 'react';

import { type AllowedAxis } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

//
// Context
//

const SCROLLAREA_NAME = 'ScrollArea';

type ScrollAreaContextType = {
  orientation: AllowedAxis;
  autoHide: boolean;
  padding: boolean;
  thin: boolean;
  snap: boolean;
};

const [ScrollAreaProvider, useScrollAreaContext] = createContext<ScrollAreaContextType>(SCROLLAREA_NAME);

//
// Root
//

const SCROLLAREA_ROOT_NAME = 'ScrollArea.Root';

type ScrollAreaRootProps = ThemedClassName<
  PropsWithChildren<HTMLAttributes<HTMLDivElement> & Partial<ScrollAreaContextType>>
>;

/**
 * ScrollArea provides native scrollbars with custom styling.
 */
const ScrollAreaRoot = forwardRef<HTMLDivElement, ScrollAreaRootProps>(
  (
    {
      classNames,
      children,
      orientation = 'vertical',
      autoHide = true,
      padding = false,
      thin = false,
      snap = false,
      ...props
    },
    forwardedRef,
  ) => {
    const { tx } = useThemeContext();
    const options = { orientation, autoHide, padding, thin, snap };

    return (
      <ScrollAreaProvider {...options}>
        <div {...props} className={tx('scrollArea.root', 'scroll-area', options, classNames)} ref={forwardedRef}>
          {children}
        </div>
      </ScrollAreaProvider>
    );
  },
);

ScrollAreaRoot.displayName = SCROLLAREA_ROOT_NAME;

//
// Viewport
//

const SCROLLAREA_VIEWPORT_NAME = 'ScrollArea.Viewport';

type ScrollAreaViewportProps = ThemedClassName<PropsWithChildren<{}>>;

const ScrollAreaViewport = forwardRef<HTMLDivElement, ScrollAreaViewportProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const options = useScrollAreaContext(SCROLLAREA_VIEWPORT_NAME);

    return (
      <div
        {...props}
        className={tx('scrollArea.viewport', 'scroll-area__viewport', options, classNames)}
        ref={forwardedRef}
      >
        {children}
      </div>
    );
  },
);

ScrollAreaViewport.displayName = SCROLLAREA_VIEWPORT_NAME;

//
// ScrollArea
//

export const ScrollArea = {
  Root: ScrollAreaRoot,
  Viewport: ScrollAreaViewport,
};

export type { ScrollAreaRootProps, ScrollAreaViewportProps };
