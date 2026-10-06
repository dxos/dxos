//
// Copyright 2026 DXOS.org
//

import React, { memo } from 'react';

import { type Bounds } from '../../model/types.ts';
import { type LatticeSpec, cellBounds } from '../../utils/lattice.ts';

/** Above this many cells the lattice reads as texture rather than places, so it is not drawn. */
const MAX_CELLS = 4096;

export type LatticeGridProps = {
  spec: LatticeSpec;
  /** The scene area to cover, in scene units. */
  bounds: Bounds;
  /** One screen pixel in scene units, so the outline stays a hairline at any zoom. */
  unit: number;
};

/**
 * The cells of a lattice scene (DESIGN §8b), drawn in scene coordinates as faint one-cell frames, so the
 * places a shape can land and the gutters between them are visible before anything is dropped.
 */
export const LatticeGrid = memo(({ spec, bounds, unit }: LatticeGridProps) => {
  const [pitchX, pitchY] = [spec.width + spec.gutterX, spec.height + spec.gutterY];
  const [fromCol, toCol] = [Math.floor(bounds.x / pitchX), Math.ceil((bounds.x + bounds.width) / pitchX)];
  const [fromRow, toRow] = [Math.floor(bounds.y / pitchY), Math.ceil((bounds.y + bounds.height) / pitchY)];
  if ((toCol - fromCol + 1) * (toRow - fromRow + 1) > MAX_CELLS) {
    return null;
  }

  const cells: Bounds[] = [];
  for (let row = fromRow; row <= toRow; row++) {
    for (let col = fromCol; col <= toCol; col++) {
      cells.push(cellBounds({ col, row, spanX: 1, spanY: 1 }, spec));
    }
  }

  return (
    <svg className='absolute overflow-visible pointer-events-none' width={1} height={1} data-testid='lattice-grid'>
      {cells.map((cell) => (
        <rect
          key={`${cell.x},${cell.y}`}
          x={cell.x}
          y={cell.y}
          width={cell.width}
          height={cell.height}
          className='fill-none stroke-separator'
          strokeWidth={unit}
          strokeDasharray={`${4 * unit} ${4 * unit}`}
        />
      ))}
    </svg>
  );
});

LatticeGrid.displayName = 'LatticeGrid';
