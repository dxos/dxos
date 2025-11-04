//
// Copyright 2025 DXOS.org
//

import { type CellLayout, type Position, type Size } from './types';

export type Rect = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;

export type BoardGeometry = {
  size: Size;
  gap: number;
  overScroll?: number;
};

export const getCenter = (rect: Rect): Position => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2,
});

export const getBoardBounds = (size: Size, board: BoardGeometry): Size => ({
  width: size.width * (board.size.width + board.gap) + board.gap,
  height: size.height * (board.size.height + board.gap) + board.gap,
});

export const getBoardRect = (board: BoardGeometry, { x, y, width = 1, height = 1 }: CellLayout): Rect => ({
  left: x * (board.size.width + board.gap) - board.size.width / 2,
  top: y * (board.size.height + board.gap) - board.size.height / 2,
  width: width * board.size.width + Math.max(0, width - 1) * board.gap,
  height: height * board.size.height + Math.max(0, height - 1) * board.gap,
});
