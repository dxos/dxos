//
// Copyright 2023 DXOS.org
//

import {
  Root as ScrollAreaPrimitiveRoot,
  type ScrollAreaProps as ScrollAreaPrimitiveRootProps,
  Viewport as ScrollAreaPrimitiveViewport,
  type ScrollAreaViewportProps as ScrollAreaPrimitiveViewportProps,
  Scrollbar as ScrollAreaPrimitiveScrollbar,
  type ScrollAreaScrollbarProps as ScrollAreaPrimitiveScrollbarProps,
  Thumb as ScrollAreaPrimitiveThumb,
  type ScrollAreaThumbProps as ScrollAreaPrimitiveThumbProps,
  Corner as ScrollAreaPrimitiveCorner,
  type ScrollAreaCornerProps as ScrollAreaPrimitiveCornerProps,
} from '@radix-ui/react-scroll-area';
import React, { forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

type ScrollAreaVariant = 'coarse' | 'fine';

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

export const ScrollArea = {
  Root: ScrollAreaRoot,
  Viewport: ScrollAreaViewport,
  Scrollbar: ScrollAreaScrollbar,
  Thumb: ScrollAreaThumb,
  Corner: ScrollAreaCorner,
};

export type {
  ScrollAreaRootProps,
  ScrollAreaViewportProps,
  ScrollAreaScrollbarProps,
  ScrollAreaThumbProps,
  ScrollAreaCornerProps,
};
