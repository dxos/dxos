//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { FC, createContext, useState, useContext, useMemo, ReactNode, useEffect, useRef } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { useMediaQuery } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';

// TODO(burdon): Context.
// TODO(burdon): Click to center.
// TODO(burdon): Scale container.

const createMatrix = <TValue,>(rangeX: number, rangeY: number, value: (position: Position) => TValue): TValue[][] => {
  const matrix: TValue[][] = [];
  for (let x = 0; x < rangeX; x++) {
    matrix.push(Array.from({ length: rangeY }, (_, y) => value({ x, y })));
  }

  return matrix;
};

type Bounds = { width: number; height: number };
type Position = { x: number; y: number };

const getPosition = ({ x, y }: Position, { width, height }: Bounds) => ({ left: x * width, top: y * height });
const getBounds = ({ x, y }: Position, { width, height }: Bounds, padding = 0) => ({
  left: x * width + padding,
  top: y * height + padding,
  width: width - padding * 2,
  height: height - padding * 2,
});

// TODO(burdon): Delegate.
type GridItem = {
  id: string;
  position?: Position;
  card: ReactNode;
};

//
// Context.
//

type GridContextType = {
  defaultCellBounds: Bounds;
  padding?: number;
};

const defaultGrid: GridContextType = {
  defaultCellBounds: { width: 300, height: 300 },
  padding: 8,
};

const GridContext = createContext<GridContextType>(defaultGrid);

const useGrid = () => {
  return useContext(GridContext);
};

/**
 *
 */
const GridContainer: FC<{ items: GridItem[]; size: { x: number; y: number }; center?: Position }> = ({
  items,
  size = { x: 8, y: 8 },
}) => {
  return (
    <GridContext.Provider value={defaultGrid}>
      <GridPanel items={items} size={size} />
    </GridContext.Provider>
  );
};

const getCellWidth = (defaultWidth: number, screenWidth: number) => {
  const min = 240;
  const max = 400;
  if (screenWidth > min && screenWidth < max) {
    return screenWidth;
  }

  return defaultWidth;
};

/**
 *
 */
const GridPanel: FC<{
  items: GridItem[];
  size: { x: number; y: number };
  square?: boolean;
  onSelect?: (id: string) => void;
}> = ({ items, size, square = true, onSelect }) => {
  // TODO(burdon): BUG: React has detected a change in the order of Hooks.
  const { ref: containerRef, width, height } = useResizeDetector({ refreshRate: 200 });
  const contentRef = useRef<HTMLDivElement>(null);

  const { defaultCellBounds, padding } = useGrid();
  const { matrix, bounds, cellBounds } = useMemo(() => {
    // Change default cell bounds to screen width if mobile.
    const cellWidth = getCellWidth(defaultCellBounds.width, width ?? 0);
    const cellBounds = {
      width: cellWidth,
      height: square ? cellWidth : defaultCellBounds.height,
    };

    return {
      matrix: createMatrix(size.x, size.y, ({ x, y }) => ({ x, y })),
      bounds: { width: size.x * cellBounds.width, height: size.y * cellBounds.height },
      cellBounds,
    };
  }, [defaultCellBounds, size, width]);

  const [isNotMobile] = useMediaQuery('md');
  const margin = isNotMobile ? Math.max(cellBounds.width, cellBounds.height) : 0;

  const setCenter = (id: string) => {
    const item = items.find((item) => item.id === id);
    if (item && width && height) {
      const pos = getPosition(item.position!, cellBounds);
      const top = pos.top + margin - (height - cellBounds.height) / 2;
      const left = pos.left + margin - (width - cellBounds.width) / 2;
      containerRef.current!.scrollTo({ top, left, behavior: 'smooth' });
    }
  };

  const [selected, setSelected] = useState<string>();
  const handleSelect = (id: string) => {
    setSelected(id);
    setCenter(id);
    onSelect?.(id);
  };

  useEffect(() => {
    if (selected) {
      // Center on selected.
      setCenter(selected);
    } else {
      // Center on screen.
      if (width && height && isNotMobile) {
        const center = {
          x: (contentRef.current!.offsetWidth + margin * 2 - width) / 2,
          y: (contentRef.current!.offsetHeight + margin * 2 - height) / 2,
        };

        containerRef.current!.scrollTo({ top: center.y, left: center.x, behavior: 'smooth' });
      }
    }
  }, [selected, width, height]);

  return (
    <div ref={containerRef} className='grow overflow-auto snap-x snap-mandatory md:snap-none bg-neutral-300'>
      <div ref={contentRef} className='block relative' style={{ ...bounds, margin }}>
        {matrix.map((row) =>
          row.map(({ x, y }) => <Cell key={`${x}-${y}`} position={{ x, y }} cellBounds={cellBounds} />),
        )}

        {items.map(({ id, position, card }) => (
          <div
            key={id}
            className='absolute overflow-hidden'
            style={getBounds(position ?? { x: 0, y: 0 }, cellBounds, padding)}
            onDoubleClick={() => handleSelect(id)}
          >
            {card}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 *
 */
const Cell: FC<{ position: Position; cellBounds: Bounds }> = ({ position, cellBounds }) => {
  const bounds = {
    ...getPosition(position, cellBounds),
    ...cellBounds,
  };

  return (
    <div
      style={{ ...bounds }}
      className={mx(
        'absolute flex justify-center items-center grow select-none cursor-pointer snap-center',
        'bg-neutral-100 border border-neutral-125',
      )}
    >
      <div className='font-mono text-sm text-neutral-200 hidden'>{JSON.stringify(position)}</div>
    </div>
  );
};

export const Grid = {
  Root: GridContainer,
};

export type { GridItem };
