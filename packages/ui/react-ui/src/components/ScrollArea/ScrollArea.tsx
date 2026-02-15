//
// Copyright 2026 DXOS.org
//

import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import React, { forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

// TODO(burdon): Reconcile with Axis. Move to ui-types.
type Orientation = 'vertical' | 'horizontal' | 'both';

type ScrollAreaProps = ThemedClassName<ScrollAreaPrimitive.ScrollAreaProps> & {
  orientation?: Orientation;
  thin?: boolean;
};

type ScrollBarProps = ThemedClassName<ScrollAreaPrimitive.ScrollAreaScrollbarProps> & {
  thin?: boolean;
};

/**
 * ScrollArea provides a styled scrollable area with custom scrollbars.
 * Based on shadcn/ui's ScrollArea component pattern.
 */
const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ classNames, children, orientation = 'vertical', thin, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const showVertical = orientation === 'vertical' || orientation === 'both';
    const showHorizontal = orientation === 'horizontal' || orientation === 'both';

    return (
      <ScrollAreaPrimitive.Root
        {...props}
        className={tx('scrollArea.root', 'scroll-area', { orientation, thin }, classNames)}
        ref={forwardedRef}
      >
        <ScrollAreaPrimitive.Viewport className={tx('scrollArea.viewport', 'scroll-area__viewport')}>
          {children}
        </ScrollAreaPrimitive.Viewport>
        {showVertical && <ScrollBar orientation='vertical' thin={thin} />}
        {showHorizontal && <ScrollBar orientation='horizontal' thin={thin} />}
        <ScrollAreaPrimitive.Corner className={tx('scrollArea.corner', 'scroll-area__corner')} />
      </ScrollAreaPrimitive.Root>
    );
  },
);

/**
 * ScrollBar component for use within ScrollArea.
 */
const ScrollBar = forwardRef<HTMLDivElement, ScrollBarProps>(
  ({ classNames, orientation = 'vertical', thin, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <ScrollAreaPrimitive.Scrollbar
        orientation={orientation}
        {...props}
        className={tx('scrollArea.scrollbar', 'scroll-area__scrollbar', { orientation, thin }, classNames)}
        ref={forwardedRef}
      >
        <ScrollAreaPrimitive.Thumb className={tx('scrollArea.thumb', 'scroll-area__thumb', { thin })} />
      </ScrollAreaPrimitive.Scrollbar>
    );
  },
);

export { ScrollArea, ScrollBar };

export type { ScrollAreaProps, ScrollBarProps };
