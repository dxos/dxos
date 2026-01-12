//
// Copyright 2023 DXOS.org
//

import {
  Corner as ScrollAreaPrimitiveCorner,
  type ScrollAreaCornerProps as ScrollAreaPrimitiveCornerProps,
  Root as ScrollAreaPrimitiveRoot,
  type ScrollAreaProps as ScrollAreaPrimitiveRootProps,
  Scrollbar as ScrollAreaPrimitiveScrollbar,
  type ScrollAreaScrollbarProps as ScrollAreaPrimitiveScrollbarProps,
  Thumb as ScrollAreaPrimitiveThumb,
  type ScrollAreaThumbProps as ScrollAreaPrimitiveThumbProps,
  Viewport as ScrollAreaPrimitiveViewport,
  type ScrollAreaViewportProps as ScrollAreaPrimitiveViewportProps,
} from '@radix-ui/react-scroll-area';
import React, { type PropsWithChildren, forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

type ScrollAreaVariant = 'coarse' | 'fine';

//
// Root
//

type ScrollAreaRootProps = ThemedClassName<ScrollAreaPrimitiveRootProps>;

const ScrollAreaRoot = forwardRef<HTMLDivElement, ScrollAreaRootProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <ScrollAreaPrimitiveRoot
      {...props}
      className={tx('scrollArea.root', 'scroll-area', {}, classNames)}
      ref={forwardedRef}
    />
  );
});

//
// Viewport
//

type ScrollAreaViewportProps = ThemedClassName<ScrollAreaPrimitiveViewportProps>;

const ScrollAreaViewport = forwardRef<HTMLDivElement, ScrollAreaViewportProps>(
  ({ classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <ScrollAreaPrimitiveViewport
        {...props}
        className={tx('scrollArea.viewport', 'scroll-area', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

//
// Scrollbar
//

type ScrollAreaScrollbarProps = ThemedClassName<ScrollAreaPrimitiveScrollbarProps> & { variant?: ScrollAreaVariant };

const ScrollAreaScrollbar = forwardRef<HTMLDivElement, ScrollAreaScrollbarProps>(
  ({ classNames, variant = 'fine', ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <ScrollAreaPrimitiveScrollbar
        data-variant={variant}
        {...props}
        className={tx('scrollArea.scrollbar', 'scroll-area__scrollbar', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

//
// Thumb
//

type ScrollAreaThumbProps = ThemedClassName<ScrollAreaPrimitiveThumbProps>;

const ScrollAreaThumb = forwardRef<HTMLDivElement, ScrollAreaThumbProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <ScrollAreaPrimitiveThumb
      {...props}
      className={tx('scrollArea.thumb', 'scroll-area__thumb', {}, classNames)}
      ref={forwardedRef}
    />
  );
});

//
// Corner
//

type ScrollAreaCornerProps = ThemedClassName<ScrollAreaPrimitiveCornerProps>;

const ScrollAreaCorner = forwardRef<HTMLDivElement, ScrollAreaCornerProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <ScrollAreaPrimitiveCorner
      {...props}
      className={tx('scrollArea.corner', 'scroll-area__corner', {}, classNames)}
      ref={forwardedRef}
    />
  );
});

//
// Expander
//

type ScrollAreaExpanderProps = ThemedClassName<PropsWithChildren>;

/**
 * Size-locking wrapper required for inner ScrollArea to function correctly.
 * NOTE: Radix ScrollArea.Viewport applies `display: table` to its immediate child,
 * causing the content to participate in table layout and escape the intended fixed-size viewport.
 */
const ScrollAreaExpander = ({ classNames, children }: ScrollAreaExpanderProps) => {
  return (
    <div role='none' className={mx('relative bs-full is-full overflow-hidden', classNames)}>
      <div role='none' className='absolute inset-0 overflow-hidden'>
        {children}
      </div>
    </div>
  );
};

//
// ScrollArea
//

export const ScrollArea = {
  Root: ScrollAreaRoot,
  Viewport: ScrollAreaViewport,
  Scrollbar: ScrollAreaScrollbar,
  Thumb: ScrollAreaThumb,
  Corner: ScrollAreaCorner,
  Expander: ScrollAreaExpander,
};

export type {
  ScrollAreaRootProps,
  ScrollAreaViewportProps,
  ScrollAreaScrollbarProps,
  ScrollAreaThumbProps,
  ScrollAreaCornerProps,
  ScrollAreaExpanderProps,
};
