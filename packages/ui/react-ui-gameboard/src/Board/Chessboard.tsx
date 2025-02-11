//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, type PropsWithChildren } from 'react';

import { Square } from './Square';
import { type Coord } from './types';
import { locationToPos } from '../chess';

const getColor = ([row, col]: Coord) => {
  return (col * 7 + row) % 2 === 0 ? 'bg-neutral-200' : 'bg-neutral-50';
};

type ChessboardProps = PropsWithChildren<{ rows: number; cols: number }>;

/**
 * Chessboard.
 */
export const Chessboard = forwardRef<HTMLDivElement, ChessboardProps>(({ rows, cols, children }, forwardedRef) => {
  return (
    <div ref={forwardedRef} className='relative'>
      <div className='grid grid-cols-8 grid-rows-8 aspect-square select-none'>
        {Array.from({ length: rows }, (_, i) => rows - 1 - i).map((row) =>
          Array.from({ length: cols }).map((_, col) => (
            <Square
              key={[row, col].join(',')}
              label={locationToPos([row, col])}
              location={[row, col]}
              classNames={[getColor([row, col])]}
            />
          )),
        )}
      </div>
      <div>{children}</div>
    </div>
  );
});
