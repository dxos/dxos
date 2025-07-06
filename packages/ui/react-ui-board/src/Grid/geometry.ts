//
// Copyright 2025 DXOS.org
//

import { type Size } from './types';

export type GridGeometry = {
  size: Size;
  gap: number;
};

export const getGridBounds = (size: Size, grid: GridGeometry): Size => ({
  width: size.width * (grid.size.width + grid.gap),
  height: size.height * (grid.size.height + grid.gap),
});
