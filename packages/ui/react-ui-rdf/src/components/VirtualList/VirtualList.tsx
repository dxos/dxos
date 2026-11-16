//
// Copyright 2026 DXOS.org
//

import { useVirtualizer } from '@tanstack/react-virtual';
import React, { type ReactNode, useEffect } from 'react';

import * as Util from '@dxos/react-ui/Util';

/** Rows rendered beyond each edge of the viewport, so arrow keys and fast scrolls land on a mounted row. */
const OVERSCAN = 8;

export type VirtualListProps = {
  count: number;
  /** A stable key per row, so measured heights survive filtering and reordering. */
  getKey: (index: number) => string;
  /** Renders one row. */
  renderItem: (index: number) => ReactNode;
  /** The scrolling element (a `ScrollArea.Viewport`); nothing renders until it is known. */
  scrollElement: HTMLElement | null;
  /** A first guess at a row's height in px; every row is measured once it mounts. */
  estimateSize: number;
  /** Space between rows in px. */
  gap?: number;
  /** Pads the first and last row by this many px, inside the scrolled content. */
  padding?: number;
  /** The index of a row to keep in view: whenever it changes, the list scrolls just far enough to show it. */
  activeIndex?: number;
  /** Called with the first and last row rendered (overscan included) whenever they change, so rows can load in view. */
  onRangeChange?: (start: number, end: number) => void;
};

/**
 * Renders only the rows near the viewport of `scrollElement`, measuring each as it mounts, so a list of thousands of
 * variable-height cards costs no more than the screenful in view. The TanStack virtualizer Mosaic's `VirtualStack`
 * wraps, without that stack's drag-and-drop container (which needs a `Dnd.Root` above it).
 */
// Composable, so a `Focus.Group asChild` can make the list its arrow-key group.
export const VirtualList = Util.composable<HTMLDivElement, VirtualListProps>(
  (
    {
      count,
      getKey,
      renderItem,
      scrollElement,
      estimateSize,
      gap = 0,
      padding = 0,
      activeIndex,
      onRangeChange,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const virtualizer = useVirtualizer({
      count,
      getScrollElement: () => scrollElement,
      estimateSize: () => estimateSize,
      getItemKey: getKey,
      gap,
      paddingStart: padding,
      paddingEnd: padding,
      overscan: OVERSCAN,
      // A row measured in its ref callback would otherwise flushSync inside React's commit, which React rejects.
      useFlushSync: false,
    });

    useEffect(() => {
      if (activeIndex !== undefined && activeIndex >= 0 && activeIndex < count) {
        virtualizer.scrollToIndex(activeIndex, { align: 'auto' });
      }
    }, [virtualizer, activeIndex, count]);

    const items = virtualizer.getVirtualItems();
    const first = items.at(0)?.index ?? -1;
    const last = items.at(-1)?.index ?? -1;
    useEffect(() => {
      if (first >= 0) {
        onRangeChange?.(first, last);
      }
    }, [first, last, onRangeChange]);

    return (
      <div
        {...Util.composableProps(props, {
          // shrink-0: the height is set inline, and a flex parent (the viewport) would otherwise squeeze it to its own.
          classNames: 'relative w-full shrink-0',
          style: { height: virtualizer.getTotalSize() },
        })}
        ref={forwardedRef}
      >
        {items.map(({ key, index, start }) => (
          <div
            key={key}
            role='none'
            data-index={index}
            className='absolute top-0 left-0 w-full'
            style={{ transform: `translateY(${start}px)` }}
            ref={virtualizer.measureElement}
          >
            {renderItem(index)}
          </div>
        ))}
        {children}
      </div>
    );
  },
);

VirtualList.displayName = 'VirtualList';
