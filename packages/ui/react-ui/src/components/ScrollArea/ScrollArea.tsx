//
// Copyright 2026 DXOS.org
//

import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import React, { type RefCallback, forwardRef } from 'react';

import { type AllowedAxis, type Axis } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

// TODO(burdon): Create natural alternative for mobile (use theme context).

type ScrollAreaProps = ThemedClassName<ScrollAreaPrimitive.ScrollAreaProps> & {
  viewportRef?: RefCallback<HTMLElement | null>;
  orientation?: AllowedAxis;
  padding?: boolean;
  thin?: boolean;
  snap?: boolean;
};

/**
 * ScrollArea provides a styled scrollable area with custom scrollbars.
 */
const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ classNames, children, viewportRef, orientation = 'vertical', padding, thin, snap, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const showVertical = orientation === 'vertical' || orientation === 'all';
    const showHorizontal = orientation === 'horizontal' || orientation === 'all';

    return (
      <ScrollAreaPrimitive.Root
        {...props}
        className={tx('scrollArea.root', 'scroll-area', { orientation, padding, thin }, classNames)}
        ref={forwardedRef}
      >
        <ScrollAreaPrimitive.Viewport
          className={tx('scrollArea.viewport', 'scroll-area__viewport', { orientation, snap })}
          ref={viewportRef}
        >
          {children}
        </ScrollAreaPrimitive.Viewport>
        {showVertical && <ScrollBar orientation='vertical' thin={thin} />}
        {showHorizontal && <ScrollBar orientation='horizontal' thin={thin} />}
        <ScrollAreaPrimitive.Corner className={tx('scrollArea.corner', 'scroll-area__corner')} />
      </ScrollAreaPrimitive.Root>
    );
  },
);

type ScrollBarProps = ThemedClassName<ScrollAreaPrimitive.ScrollAreaScrollbarProps> & {
  orientation?: Axis;
  thin?: boolean;
};

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
