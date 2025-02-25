//
// Copyright 2025 DXOS.org
//

import React, { useState, useEffect, type CSSProperties } from 'react';
import { useResizeDetector } from 'react-resize-detector';

/**
 * Represents a single item in the responsive grid.
 */
export type ResponsiveGridItem = {
  id: string;
  videoUrl: string;
};

/**
 * Props for the ResponsiveGrid component.
 */
export type ResponsiveGridProps = {
  /** Array of items to display in the grid. */
  items: ResponsiveGridItem[];
  /** ID of the pinned item. */
  pinned?: string;
  /** Space between grid items in pixels. */
  gap?: number;
};

/**
 * A responsive grid component that automatically adjusts its layout to optimize space usage.
 * Maintains aspect ratio of items while ensuring uniform gaps between them.
 */
// TODO(burdon): Handle pinning.
export const ResponsiveGrid = ({ items, pinned: _pinned, gap = 16 }: ResponsiveGridProps) => {
  const { width = 0, height = 0, ref } = useResizeDetector<HTMLDivElement>({ refreshRate: 200 });
  const [divider, setDivider] = useState(500);
  const [pinned, setPinned] = useState<string | undefined>(_pinned);

  const pinnedItem = items.find((item) => item.id === pinned);
  const mainItems = items.filter((item) => item.id !== pinned);

  // Recalculate optimal columns when container size or items change.
  const [columns, setColumns] = useState(1);
  const cellWidth = Math.floor((width - gap * (columns - 1)) / columns);
  useEffect(() => {
    if (width > 0 && height > 0) {
      setColumns(calculateOptimalColumns(width, height, items.length, gap));
    }
  }, [width, height, items.length, gap]);

  // Absolutely positioned items.
  const [bounds, setBounds] = useState<[ResponsiveGridItem, CSSProperties][]>([]);
  useEffect(() => {
    if (!ref.current) {
      return;
    }

    // TODO(burdon): Consider directly setting bounds instead of state update.
    const t = setTimeout(() => {
      setBounds(items.map((item) => [item, getBounds(ref.current!, item.id)]));
    });
    return () => clearTimeout(t);
  }, [ref.current, mainItems, width, height]);

  return (
    <div className='relative flex flex-col is-full overflow-hidden divide-y divide-neutral-200'>
      {pinnedItem && (
        <div className='flex grow justify-center' style={{ height: divider, padding: gap }}>
          <div {...{ 'data-grid-item': pinned }} className='p-2 aspect-video bg-neutral-200 rounded-lg opacity-10' />
        </div>
      )}

      <div ref={ref} className='flex w-full h-full items-center justify-center' style={{ padding: gap }}>
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
              key={item.id}
              {...{ 'data-grid-item': item.id }}
              className='p-2 aspect-video bg-neutral-200 rounded-lg opacity-10'
            />
          ))}
        </div>
        <div>
          {ref.current &&
            bounds.map(([item, bounds]) => (
              <div
                key={item.id}
                className='absolute rounded-lg transition-all duration-500'
                style={bounds}
                onClick={() => setPinned((pinned) => (pinned === item.id ? undefined : item.id))}
              >
                <video src={item.videoUrl} autoPlay muted />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

const getBounds = (root: HTMLElement, id: string) => {
  const el = document.querySelector(`[data-grid-item="${id}"]`)!;
  const { left, top, width, height } = el.getBoundingClientRect();
  return { left, top, width, height };
};

/**
 * Calculates the optimal number of columns for a grid layout that minimizes wasted space.
 * @param containerWidth - Width of the container in pixels.
 * @param containerHeight - Height of the container in pixels.
 * @param itemCount - Total number of items to display.
 * @param gap - Space between items in pixels.
 * @param aspectRatio - Desired aspect ratio of items (width/height).
 * @returns The optimal number of columns.
 */
const calculateOptimalColumns = (
  containerWidth: number,
  containerHeight: number,
  itemCount: number,
  gap: number,
  aspectRatio = 16 / 9,
) => {
  if (itemCount === 0) {
    return 1;
  }

  let bestColumns = 1;
  let minWastedSpace = Infinity;

  // Try different column counts to find the optimal layout that minimizes wasted space.
  for (let cols = 1; cols <= itemCount; cols++) {
    const rows = Math.ceil(itemCount / cols);

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
      bestColumns = cols;
    }
  }

  return bestColumns;
};
