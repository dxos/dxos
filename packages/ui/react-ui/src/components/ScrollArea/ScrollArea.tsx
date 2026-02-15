//
// Copyright 2026 DXOS.org
//

import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import React, { type Ref, forwardRef } from 'react';

import { type AllowedAxis, type Axis } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

type ScrollAreaProps = ThemedClassName<ScrollAreaPrimitive.ScrollAreaProps> & {
  viewportRef?: Ref<HTMLDivElement | null>;
  orientation?: AllowedAxis;
  padding?: boolean;
  thin?: boolean;
  snap?: boolean;
};

/**
 * ScrollArea provides native and custom scrollbar variants.
 * The native variant is used on mobile.
 */
const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ classNames, children, viewportRef, orientation = 'vertical', padding, thin, snap, ...props }, forwardedRef) => {
    const { tx, platform } = useThemeContext();
    const vertical = orientation === 'vertical' || orientation === 'all';
    const horizontal = orientation === 'horizontal' || orientation === 'all';
    const native = platform === 'mobile' && orientation !== 'all';
    const options = { native, orientation, padding, thin, snap };

    if (native) {
      return (
        <div role='none' className={tx('scrollArea.root', 'scroll-area', options, classNames)} ref={forwardedRef}>
          <div
            role='none'
            className={tx('scrollArea.viewport', 'scroll-area__viewport', options, [
              vertical && 'flex flex-col overflow-y-auto',
              horizontal && 'flex overflow-x-auto',
            ])}
            ref={viewportRef}
          >
            {children}
          </div>
        </div>
      );
    }

    return (
      <ScrollAreaPrimitive.Root
        {...props}
        className={tx('scrollArea.root', 'scroll-area', options, classNames)}
        ref={forwardedRef}
      >
        <ScrollAreaPrimitive.Viewport
          className={tx('scrollArea.viewport', 'scroll-area__viewport', options)}
          ref={viewportRef}
        >
          {children}
        </ScrollAreaPrimitive.Viewport>
        {vertical && <ScrollBar orientation='vertical' thin={thin} />}
        {horizontal && <ScrollBar orientation='horizontal' thin={thin} />}
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

export { ScrollArea };

export type { ScrollAreaProps };
