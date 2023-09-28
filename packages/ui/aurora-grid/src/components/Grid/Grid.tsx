//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { FC, createContext, useState, useContext, useMemo, ReactNode } from 'react';

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
type GridCard = {
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
const GridContainer: FC<{ cards: GridCard[]; size: { x: number; y: number }; center?: Position }> = ({
  cards,
  size = { x: 16, y: 16 },
  center = { x: 0, y: 0 },
}) => {
  return (
    <GridContext.Provider value={defaultGrid}>
      <div className='grow overflow-auto'>
        <GridPanel cards={cards} size={size} />
      </div>
    </GridContext.Provider>
  );
};

/**
 *
 */
const GridPanel: FC<{ cards: GridCard[]; size: { x: number; y: number } }> = ({ cards, size }) => {
  const { cellBounds, padding } = useGrid();
  const { matrix, bounds } = useMemo(
    () => ({
      matrix: createMatrix(size.x, size.y, ({ x, y }) => ({ x, y })),
      bounds: { width: size.x * cellBounds.width, height: size.y * cellBounds.height },
    }),
    [cellBounds, size],
  );

  return (
    <div className='block relative' style={{ ...bounds }}>
      {matrix.map((row) => row.map(({ x, y }) => <Cell key={`${x}-${y}`} position={{ x, y }} />))}
      {cards.map(({ id, position, card }) => (
        <div
          key={id}
          style={getBounds(position ?? { x: 0, y: 0 }, cellBounds, padding)}
          className='absolute overflow-hidden'
        >
          {card}
        </div>
      ))}
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
        'absolute flex justify-center items-center grow border select-none',
        'bg-neutral-50 border-neutral-100 opacity-50',
      )}
    >
      <div className='font-mono text-sm text-neutral-200'>{JSON.stringify(position)}</div>
    </div>
  );
};

export const Grid = {
  Root: GridContainer,
};

export type { GridCard };
