//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type HTMLAttributes, forwardRef, useMemo } from 'react';

import { composableProps, slottable } from '@dxos/ui-theme';
import { type AllowedAxis, type SlottableProps, type ThemedClassName } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';

//
// Context
//

const SCROLLAREA_NAME = 'ScrollArea';

type ScrollAreaContextType = {
  /** Orientation of scrollbars. */
  orientation: AllowedAxis;
  /** Hide scrollbars when not scrolling. */
  autoHide: boolean;
  /** Apply padding to opposite side of scrollbar. */
  // TODO(burdon): Rename `center`.
  margin?: boolean;
  /** Apply padding. */
  padding: boolean;
  /** Use thin scrollbars. */
  thin: boolean;
  /** Enable snap scrolling. */
  snap: boolean;
};

const [ScrollAreaProvider, useScrollAreaContext] = createContext<ScrollAreaContextType>(SCROLLAREA_NAME);

//
// Root
//

const SCROLLAREA_ROOT_NAME = 'ScrollArea.Root';

type ScrollAreaRootProps = SlottableProps<Partial<ScrollAreaContextType>>;

/**
 * ScrollArea provides native scrollbars with custom styling.
 */
const ScrollAreaRoot = slottable<HTMLDivElement, Partial<ScrollAreaContextType>>(
  (
    {
      children,
      asChild,
      orientation = 'vertical',
      autoHide = true,
      margin = false,
      padding = false,
      thin = false,
      snap = false,
      ...props
    },
    forwardedRef,
  ) => {
    const { tx } = useThemeContext();
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    const options = useMemo(
      () => ({ orientation, autoHide, margin, padding, thin, snap }),
      [orientation, autoHide, margin, padding, thin, snap],
    );

    return (
      <ScrollAreaProvider {...options}>
        <Comp {...rest} className={tx('scrollArea.root', options, className)} ref={forwardedRef}>
          {children}
        </Comp>
      </ScrollAreaProvider>
    );
  },
);

ScrollAreaRoot.displayName = SCROLLAREA_ROOT_NAME;

//
// Viewport
//

const SCROLLAREA_VIEWPORT_NAME = 'ScrollArea.Viewport';

type ScrollAreaViewportProps = ThemedClassName<HTMLAttributes<HTMLDivElement>>;

const ScrollAreaViewport = forwardRef<HTMLDivElement, ScrollAreaViewportProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const options = useScrollAreaContext(SCROLLAREA_VIEWPORT_NAME);

    return (
      <div {...props} className={tx('scrollArea.viewport', options, classNames)} ref={forwardedRef}>
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
