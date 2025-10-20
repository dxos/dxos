//
// Copyright 2025 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import {
  type UseMasonryOptions,
  type UsePositionerOptions,
  useMasonry,
  usePositioner,
  useResizeObserver,
} from 'masonic';
import React, {
  type ComponentPropsWithRef,
  type ForwardedRef,
  type JSX,
  type Ref,
  forwardRef,
  useMemo,
  useRef,
} from 'react';

import { useScroller, useSize } from '@dxos/react-hooks';
import { type ThemedClassName, usePx } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

type MasonryRootProps<Item> = ThemedClassName<ComponentPropsWithRef<'div'>> &
  Omit<UsePositionerOptions, 'width'> &
  Omit<
    UseMasonryOptions<Item>,
    | 'height'
    | 'scrollTop'
    | 'isScrolling'
    | 'resizeObserver'
    | 'positioner'
    | 'as'
    | 'id'
    | 'itemAs'
    | 'itemStyle'
    | 'className'
    | 'style'
    | 'role'
    | 'tabIndex'
    | 'containerRef'
  >;

const usePxProps = (remProps: Omit<UsePositionerOptions, 'width' | 'columnCount' | 'maxColumnCount'>) => {
  const remInPx = usePx(1);
  return useMemo(() => {
    return Object.fromEntries(
      Object.entries(remProps).map(([key, value]) => {
        return [key, value * remInPx];
      }),
    );
  }, [remProps, remInPx]);
};

const MasonryRootImpl = <Item,>(
  {
    columnCount,
    maxColumnCount,
    columnWidth,
    maxColumnWidth,
    columnGutter,
    rowGutter,
    items,
    itemHeightEstimate,
    itemKey,
    overscanBy,
    render,
    onRender,
    classNames,
    ...props
  }: MasonryRootProps<Item>,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const ref = useComposedRefs(rootRef, forwardedRef);
  const { width, height } = useSize(rootRef);
  const { scrollTop, isScrolling } = useScroller(rootRef);
  const remProps = useMemo(
    () => ({ columnWidth, maxColumnWidth, columnGutter, rowGutter }),
    [columnWidth, maxColumnWidth, columnGutter, rowGutter],
  );
  const pxProps = usePxProps(remProps);
  const positionerProps = useMemo(
    () => ({
      width,
      columnCount,
      maxColumnCount,
      ...pxProps,
    }),
    [width, pxProps, columnCount, maxColumnCount],
  );
  const positioner = usePositioner(positionerProps, [positionerProps]);
  const resizeObserver = useResizeObserver(positioner);
  const children = useMasonry({
    height,
    scrollTop,
    isScrolling,
    resizeObserver,
    positioner,
    items,
    itemHeightEstimate,
    itemKey,
    overscanBy,
    render,
    onRender,
  });
  return (
    <div className={mx(classNames)} {...props} ref={ref}>
      {children}
    </div>
  );
};

const MasonryRoot = forwardRef(MasonryRootImpl) as <Item>(
  props: MasonryRootProps<Item> & {
    ref?: Ref<HTMLDivElement | null>;
  },
) => JSX.Element;

export const Masonry = {
  Root: MasonryRoot,
};

export type { MasonryRootProps };
