//
// Copyright 2025 DXOS.org
//

import React, { type ComponentType, type FC, useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { invariant } from '@dxos/invariant';
import { type ThemedClassName } from '@dxos/react-ui';
import { type Size } from '@dxos/react-ui-dnd';
import { mx } from '@dxos/react-ui-theme';

import { ResponsiveContainer } from './ResponsiveContainer';
import { type ResponsiveGridItemProps } from './ResponsiveGridItem';

const ASPECT_RATIO = 16 / 9;
const MIN_GALLERY_HEIGHT = 250;

const DEFAULT_GAP = 8;

const maxImageSize = 'w-[2560px] h-[1440px]';

/**
 * Props for the ResponsiveGrid component.
 */
export type ResponsiveGridProps<T extends object = any> = ThemedClassName<{
  /** Cell component. */
  Cell: ComponentType<ResponsiveGridItemProps<T>>;

  /** Space between grid items in pixels. */
  gap?: number;

  /** Function to get the ID of an item. */
  getId?: (item: T) => string;

  /** Array of items to display in the grid. */
  items: T[];

  /** ID of the pinned item. */
  pinned?: string;

  /** Whether to hide the gallery (unpinned items) when an item is pinned. */
  autoHideGallery?: boolean;

  /** Whether the divider is resizable. */
  resizable?: boolean;

  /** Debug mode. */
  debug?: boolean;

  /** Callback when the pinned item changes. */
  onPinnedChange?: (pinned: string | undefined) => void;
}>;

const defaultGetId: ResponsiveGridProps<any>['getId'] = (item: any) => item.id;

/**
 * A responsive grid component that automatically adjusts its layout to optimize space usage.
 * Maintains aspect ratio of items while ensuring uniform gaps between them.
 */
export const ResponsiveGrid = <T extends object = any>({
  classNames,
  Cell,
  gap = DEFAULT_GAP,
  getId = defaultGetId,
  items,
  pinned,
  autoHideGallery = false,
  debug,
  onPinnedChange,
}: ResponsiveGridProps<T>) => {
  const {
    width: containerWidth = 0,
    height: containerHeight = 0,
    ref: containerRef,
  } = useResizeDetector<HTMLDivElement>({ refreshRate: 100 });
  const [dividerHeight, setDividerHeight] = useState<Size>(0);
  useEffect(() => {
    if (containerWidth && containerHeight) {
      const { height } = fitAspectRatio(containerWidth, containerHeight, ASPECT_RATIO);
      setDividerHeight(Math.min(height, containerHeight - MIN_GALLERY_HEIGHT));
    }
  }, [containerWidth, containerHeight]);

  const pinnedItem = useMemo(() => items.find((item) => getId(item) === pinned), [items, pinned]);
  const mainItems = useMemo(() => items.filter((item) => getId(item) !== pinned), [items, pinned]);
  const hideGallery = autoHideGallery && pinnedItem !== undefined;

  //
  // Recalculate optimal layout when container size or items change.
  //
  const [{ time, columns, cellWidth }, setLayout] = useState<Layout>({ time: 0, columns: 0, cellWidth: 0 });
  const { width = 0, height = 0, ref: gridContainerRef } = useResizeDetector<HTMLDivElement>({ refreshRate: 200 });
  useEffect(() => {
    if (containerHeight && width && height) {
      const layout = calculateLayout(width, height, mainItems.length, gap);
      setLayout({ time: Date.now(), ...layout });
    }
  }, [containerHeight, width, height, mainItems.length, gap, pinned]);

  //
  // We use the browser to layout invisible divs and then calculate the absolute position of these items,
  // which are animated into position.
  //
  const [bounds, setBounds] = useState<[T, DOMRectBounds][]>([]);
  useLayoutEffect(() => {
    if ((!hideGallery && !gridContainerRef.current) || !containerHeight) {
      return;
    }

    // TODO(burdon): Consider directly setting bounds on DOM elementsinstead of state update?
    const t = setTimeout(() => {
      setBounds(
        items
          .filter((item) => !hideGallery || item === pinnedItem)
          .map((item) => {
            invariant(containerRef.current);
            const el = containerRef.current.querySelector(`[data-grid-item="${getId(item)}"]`);
            if (!el) {
              return null;
            }

            const bounds = getRelativeBounds(containerRef.current, el as HTMLElement);
            return [item, bounds];
          })
          .filter((item): item is [T, DOMRectBounds] => item !== null),
      );
    });

    return () => clearTimeout(t);
  }, [containerHeight, items, pinnedItem, hideGallery, time]);

  const handleClick = useCallback(
    (item: T) => onPinnedChange?.(getId(item) === pinned ? undefined : getId(item)),
    [pinned, onPinnedChange],
  );

  return (
    <div ref={containerRef} className={mx('relative w-full h-full', classNames)}>
      {/* Placeholder elements to calculate layout. */}
      <div className='absolute inset-0 flex flex-col grow gap-2'>
        {/* Pinned item. */}
        {pinnedItem && (
          <div
            className={mx('flex grow-[2] shrink overflow-hidden justify-center items-center', hideGallery && 'h-full')}
            style={hideGallery ? {} : { height: dividerHeight }}
          >
            <SoloItem id={getId(pinnedItem)} debug={debug} />
          </div>
        )}

        {/* Gallery. */}
        {!hideGallery && (
          <div
            ref={gridContainerRef}
            className='flex grow-[1] overflow-hidden justify-center items-center'
            style={hideGallery ? {} : { minHeight: MIN_GALLERY_HEIGHT }}
          >
            {mainItems.length === 1 && (
              <div style={{ width: cellWidth }} className='flex h-full'>
                <SoloItem id={getId(mainItems[0])} debug={debug} />
              </div>
            )}

            {mainItems.length > 1 && columns > 0 && (
              <div
                role='grid'
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${columns}, ${cellWidth}px)`,
                  gap: `${gap}px`,
                }}
              >
                {mainItems.map((item) => (
                  <div
                    key={getId(item)}
                    {...{ 'data-grid-item': getId(item) }}
                    className={mx(
                      'aspect-video max-h-full max-w-full w-auto h-auto',
                      debug && 'border border-primary-500',
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Absolutely positioned items. */}
      <div className={mx(debug && 'opacity-10')}>
        {bounds.map(([item, bounds]) => (
          <Cell
            key={getId(item)}
            classNames='absolute transition-all duration-500'
            item={item}
            style={bounds}
            pinned={getId(item) === pinned}
            onClick={items.length > 1 ? handleClick : undefined}
          />
        ))}
      </div>
    </div>
  );
};

const SoloItem: FC<Pick<ResponsiveGridProps, 'debug'> & { id: string }> = ({ debug, id }) => (
  <ResponsiveContainer>
    <div
      {...{ 'data-grid-item': id }}
      className={mx('aspect-video overflow-hidden', debug && 'z-20 border-2 border-primary-500')}
    >
      {/* Maximum size placeholder image forces aspect ratio. */}
      <img alt='placeholder video' className={mx('opacity-0', maxImageSize)} />
    </div>
  </ResponsiveContainer>
);

type DOMRectBounds = Pick<DOMRect, 'top' | 'left' | 'width' | 'height'>;

// TODO(burdon): Reconcile with react-ui-gameboard.
const getRelativeBounds = (container: HTMLElement, el: HTMLElement): DOMRectBounds => {
  const containerRect = container.getBoundingClientRect();
  const elementRect = el.getBoundingClientRect();
  return {
    top: elementRect.top - containerRect.top,
    left: elementRect.left - containerRect.left,
    width: elementRect.width,
    height: elementRect.height,
  };
};

type Layout = {
  time?: number;
  columns: number;
  cellWidth: number;
};

/**
 * Calculates the optimal number of columns for a grid layout that minimizes wasted space.
 * @param containerWidth - Width of the container in pixels.
 * @param containerHeight - Height of the container in pixels.
 * @param count - Total number of items to display.
 * @param gap - Space between items in pixels.
 * @param aspectRatio - Desired aspect ratio of items (width/height).
 * @returns The optimal number of columns.
 */
const calculateLayout = (
  containerWidth: number,
  containerHeight: number,
  count: number,
  gap: number,
  aspectRatio = ASPECT_RATIO,
): Layout => {
  if (count === 0) {
    return { columns: 1, cellWidth: 1 };
  }

  let minWastedSpace = Infinity;
  let bestColumns = 1;
  let cellWidth = 0;

  // Try different rows counts to find the optimal layout that minimizes wasted space.
  for (let rows = 1; rows <= count; rows++) {
    const cols = Math.ceil(count / rows);

    // Calculate available space accounting for gaps.
    const { width: itemWidth, height: itemHeight } = fitItemsToGrid(
      containerWidth,
      containerHeight,
      cols,
      rows,
      aspectRatio,
      gap,
    );

    // Calculate total wasted space for this configuration.
    const usedWidth = itemWidth * cols + gap * cols - 1;
    const usedHeight = itemHeight * rows + gap * rows - 1;

    // Determine if optimal.
    const wastedSpace = containerWidth * containerHeight - usedWidth * usedHeight;
    if (wastedSpace < minWastedSpace) {
      minWastedSpace = wastedSpace;
      bestColumns = cols;
      cellWidth = itemWidth;
    }
  }

  return { columns: bestColumns, cellWidth };
};

/**
 * Returns the size of the largest rectangle with the given aspect ration that fits within the grid.
 */
const fitItemsToGrid = (
  outerWidth: number,
  outerHeight: number,
  numCols: number,
  numRows: number,
  aspectRatio: number,
  gap: number,
): { width: number; height: number } => {
  // Calculate available space accounting for gaps.
  const availableWidth = outerWidth - gap * (numCols - 1);
  const availableHeight = outerHeight - gap * (numRows - 1);

  // Calculate max dimensions.
  const maxCellWidth = availableWidth / numCols;
  const maxCellHeight = availableHeight / numRows;

  // Use fitAspectRatio to get dimensions that fit within max cell size while maintaining the desired aspect ratio
  return fitAspectRatio(maxCellWidth, maxCellHeight, aspectRatio);
};

/**
 * Returns the size of the largest rectangle the given aspect ratio that fits within the outer rectangle.
 */
const fitAspectRatio = (
  outerWidth: number,
  outerHeight: number,
  aspectRatio: number,
): { width: number; height: number } => {
  if (outerWidth <= 0 || outerHeight <= 0 || aspectRatio <= 0) {
    return { width: 0, height: 0 };
  }

  // First try fitting to width.
  let width = outerWidth;
  let height = width / aspectRatio;

  // If too tall, fit to height instead.
  if (height > outerHeight) {
    height = outerHeight;
    width = height * aspectRatio;
  }

  return { width, height };
};
