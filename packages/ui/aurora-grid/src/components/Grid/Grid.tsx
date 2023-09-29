//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { FC, createContext, useState, useContext, useMemo, ReactNode, useEffect } from 'react';
import { useResizeDetector } from 'react-resize-detector';

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
  cellBounds: Bounds;
  padding?: number;
};

const defaultGrid: GridContextType = {
  cellBounds: { width: 300, height: 300 },
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
  const { cellBounds } = useGrid();

  return (
    <GridContext.Provider value={defaultGrid}>
      <GridPanel items={items} size={size} margin={cellBounds.width} />
    </GridContext.Provider>
  );
};

/**
 *
 */
const GridPanel: FC<{
  items: GridItem[];
  size: { x: number; y: number };
  margin?: number;
  onSelect?: (id: string) => void;
}> = ({ items, size, margin = 0, onSelect }) => {
  // TODO(burdon): React has detected a change in the order of Hooks.
  const { ref: containerRef, width, height } = useResizeDetector({ refreshRate: 200 });

  const { cellBounds, padding } = useGrid();
  const { matrix, bounds } = useMemo(
    () => ({
      matrix: createMatrix(size.x, size.y, ({ x, y }) => ({ x, y })),
      bounds: { width: size.x * cellBounds.width, height: size.y * cellBounds.height },
    }),
    [cellBounds, size],
  );

  const setCenter = (id: string) => {
    const item = items.find((item) => item.id === id);
    if (item && width && height) {
      const pos = getPosition(item.position!, cellBounds);
      const top = pos.top - height / 2 + cellBounds.height / 2 + margin;
      const left = pos.left - width / 2 + cellBounds.width / 2 + margin;
      containerRef.current!.scrollTo({ top, left, behavior: 'smooth' });
    }
  };

  const [selected, setSelected] = useState<string>();
  const handleSelect = (id: string) => {
    setSelected(id);
    setCenter(id);
  };

  useEffect(() => {
    if (selected) {
      setCenter(selected);
    }
  }, [selected, width, height]);

  return (
    <div ref={containerRef} className='grow overflow-auto bg-neutral-300'>
      <div className='block relative' style={{ ...bounds, margin }}>
        {matrix.map((row) => row.map(({ x, y }) => <Cell key={`${x}-${y}`} position={{ x, y }} />))}
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
const Cell: FC<{ position: Position }> = ({ position }) => {
  const { cellBounds } = useGrid();
  const [bounds] = useState({
    ...getPosition(position, cellBounds),
    ...cellBounds,
  });
  return (
    <div
      style={{ ...bounds }}
      className={mx(
        'absolute flex justify-center items-center grow select-none cursor-pointer',
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
