//
// Copyright 2025 DXOS.org
//

import { type GridPosition, type GridLayout } from './types';

export type Size = { width: number; height: number };

export type GridGeometry = {
  size: Size;
  gap: number;
};

export const getGridPosition = (
  layout: GridLayout,
  id: string,
  grid: GridGeometry,
  defaultValue: GridPosition = { x: 0, y: 0 },
): GridPosition => {
  const logical = layout.tiles[id] ?? defaultValue;
  return {
    x: logical.x * (grid.size.width + grid.gap),
    y: logical.y * (grid.size.height + grid.gap),
  };
};

export const getGridBounds = (size: Size, grid: GridGeometry): Size => ({
  width: size.width * (grid.size.width + grid.gap),
  height: size.height * (grid.size.height + grid.gap),
});
