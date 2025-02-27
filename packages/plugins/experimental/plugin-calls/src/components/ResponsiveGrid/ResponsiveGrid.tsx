//
// Copyright 2025 DXOS.org
//

import React, { useState, useEffect, useMemo, type ComponentType } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { invariant } from '@dxos/invariant';
import { resizeAttributes, ResizeHandle, sizeStyle, type Size } from '@dxos/react-ui-dnd';

import { ResponsiveContainer } from './ResponsiveContainer';
import { type ResponsiveGridItemProps } from './ResponsiveGridItem';

const MIN_HEIGHT_REM = 15;
const DEFAULT_HEIGHT_REM = 30;
/**
 * Props for the ResponsiveGrid component.
 */
export type ResponsiveGridProps<T extends object = any> = {
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

  /** Debug mode. */
  debug?: boolean;

  /** Callback when the pinned item changes. */
  onPinnedChange?: (pinned: string | undefined) => void;
};

const defaultGetId: ResponsiveGridProps<any>['getId'] = (item: any) => item.id;

/**
 * A responsive grid component that automatically adjusts its layout to optimize space usage.
 * Maintains aspect ratio of items while ensuring uniform gaps between them.
 */
export const ResponsiveGrid = <T extends object = any>({
  Cell,
  gap = 16,
  getId = defaultGetId,
  items,
  pinned,
  onPinnedChange,
}: ResponsiveGridProps<T>) => {
  const { height: containerHeight = 0, ref: containerRef } = useResizeDetector<HTMLDivElement>({ refreshRate: 200 });
  const [dividerHeight, setDividerHeight] = useState<Size>(DEFAULT_HEIGHT_REM);
  const maxDividerHeight = Math.max(DEFAULT_HEIGHT_REM, containerHeight / 16 - MIN_HEIGHT_REM);
  useEffect(() => {
    if (typeof dividerHeight === 'number' && dividerHeight > maxDividerHeight) {
      setDividerHeight(maxDividerHeight);
    }
  }, [containerHeight, dividerHeight, maxDividerHeight]);

  const pinnedItem = useMemo(() => items.find((item) => getId(item) === pinned), [items, pinned]);
  const mainItems = useMemo(() => items.filter((item) => getId(item) !== pinned), [items, pinned]);

  // Recalculate optimal columns when container size or items change.
  const [{ columns, cellWidth }, setOptimalColumns] = useState<OptimalColumns>({ columns: 0, cellWidth: 0 });
  const { width = 0, height = 0, ref: gridContainerRef } = useResizeDetector<HTMLDivElement>({ refreshRate: 200 });
  useEffect(() => {
    if (width > 0 && height > 0) {
      setOptimalColumns(calculateOptimalColumns(width, height, mainItems.length, gap));
    }
  }, [width, height, mainItems.length, gap]);

  // Absolutely positioned items.
  const [bounds, setBounds] = useState<[T, DOMRectBounds][]>([]);
  useEffect(() => {
    if (!gridContainerRef.current) {
      return;
    }

    // TODO(burdon): Consider directly setting bounds instead of state update.
    const t = setTimeout(() => {
      setBounds(
        items.map((item) => {
          invariant(containerRef.current);
          const el = containerRef.current.querySelector(`[data-grid-item="${getId(item)}"]`);
          const bounds = getRelativeBounds(containerRef.current, el as HTMLElement);
          return [item, bounds];
        }),
      );
    }, 100); // Wait until layout has been updated.
    return () => clearTimeout(t);
  }, [mainItems, width, height]);

  return (
    <div ref={containerRef} className='relative flex flex-col w-full h-full overflow-hidden'>
      {pinnedItem && (
        <>
          {/* Pinned item. */}
          <div
            {...resizeAttributes}
            className='relative flex w-full overflow-hidden border-be border-separator'
            style={{
              ...sizeStyle(dividerHeight, 'vertical'),
              paddingTop: gap,
              paddingBottom: gap,
            }}
          >
            <ResponsiveContainer>
              <div {...{ 'data-grid-item': getId(pinnedItem) }} className='aspect-video overflow-hidden'>
                {/* Placeholder image. */}
                <img className='opacity-0 w-[1280px] h-[720px]' alt='placeholder video' />
              </div>
            </ResponsiveContainer>

            <ResizeHandle
              side='block-end'
              classNames='z-10'
              defaultSize='min-content'
              minSize={MIN_HEIGHT_REM}
              maxSize={maxDividerHeight}
              fallbackSize={DEFAULT_HEIGHT_REM}
              iconPosition='center'
              onSizeChange={setDividerHeight}
            />
          </div>
        </>
      )}

      {/* Placeholder grid. */}
      <div
        ref={gridContainerRef}
        className='flex w-full grow overflow-hidden items-center justify-center'
        style={{
          paddingTop: gap,
          paddingBottom: gap,
        }}
      >
        {columns > 0 && (
          <div
            role='grid'
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, ${cellWidth}px)`,
              gap: `${gap}px`,
            }}
          >
            {mainItems.map((item) => (
              <div key={getId(item)} {...{ 'data-grid-item': getId(item) }} className='aspect-video' />
            ))}
          </div>
        )}
      </div>

      {/* Absolutely positioned items. */}
      <div>
        {bounds.map(([item, bounds]) => (
          <Cell
            key={getId(item)}
            pinned={getId(item) === pinned}
            item={item}
            style={bounds}
            classNames='absolute transition-all duration-500'
            onClick={() => onPinnedChange?.(getId(item) === pinned ? undefined : getId(item))}
          />
        ))}
      </div>
    </div>
  );
};

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

type OptimalColumns = {
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
const calculateOptimalColumns = (
  containerWidth: number,
  containerHeight: number,
  count: number,
  gap: number,
  aspectRatio = 16 / 9,
): OptimalColumns => {
  if (count === 0) {
    return { columns: 1, cellWidth: 1 };
  }

  let bestRows = 1;
  let bestColumns = 1;
  let minWastedSpace = Infinity;

  // TODO(burdon): Balance rows and columns.

  // Try different column counts to find the optimal layout that minimizes wasted space.
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);

    // Calculate available space accounting for gaps.
    const availableWidth = containerWidth - gap * (cols - 1);
    const itemWidth = availableWidth / cols;
    const itemHeight = itemWidth / aspectRatio;

    // Skip configurations that exceed container height.
    const totalHeight = itemHeight * rows + gap * (rows - 1);
    if (totalHeight > containerHeight) {
      continue;
    }

    // Calculate total wasted space for this configuration.
    const usedWidth = itemWidth * cols + gap * (cols - 1);
    const usedHeight = itemHeight * rows + gap * (rows - 1);
    const wastedSpace = containerWidth * containerHeight - usedWidth * usedHeight;
    if (wastedSpace < minWastedSpace) {
      minWastedSpace = wastedSpace;
      bestRows = rows;
      bestColumns = cols;
    }
  }

  // Prefer fewer columns to balance rows and columns.
  const cellWidth = Math.floor((containerWidth - gap * (bestColumns - 1)) / bestColumns);
  while (bestColumns > 1 && count / (bestColumns - 1) < bestRows) {
    bestColumns--;
  }

  return { columns: bestColumns, cellWidth };
};
