//
// Copyright 2025 DXOS.org
//

import { type Size, type TileLayout } from './types';

export type GridGeometry = {
  size: Size;
  gap: number;
};

export const getGridBounds = (size: Size, grid: GridGeometry): Size => ({
  width: size.width * (grid.size.width + grid.gap),
  height: size.height * (grid.size.height + grid.gap),
});

export type Rect = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;

export const getGridRect = (grid: GridGeometry, { x, y, width = 1, height = 1 }: TileLayout): Rect => {
  return {
    left: x * (grid.size.width + grid.gap) - grid.size.width / 2,
    top: y * (grid.size.height + grid.gap) - grid.size.height / 2,
    width: width * grid.size.width + Math.max(0, width - 1) * grid.gap,
    height: height * grid.size.height + Math.max(0, height - 1) * grid.gap,
  };
};

export const getCenter = (rect: Rect): { x: number; y: number } => {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
};
