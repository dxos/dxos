//
// Copyright 2023 DXOS.org
//

import { Bounds, Position } from '../../dnd';

export const createMatrix = <TValue>(
  rangeX: number,
  rangeY: number,
  value: (position: Position) => TValue,
): TValue[][] => {
  const matrix: TValue[][] = [];
  for (let x = 0; x < rangeX; x++) {
    matrix.push(Array.from({ length: rangeY }, (_, y) => value({ x, y })));
  }

  return matrix;
};

export const getPosition = ({ x, y }: Position, { width, height }: Bounds) => ({ left: x * width, top: y * height });

export const getBounds = ({ x, y }: Position, { width, height }: Bounds, padding = 0) => ({
  left: x * width + padding,
  top: y * height + padding,
  width: width - padding * 2,
  height: height - padding * 2,
});

export const calculateCellWidth = (
  defaultWidth: number,
  screenWidth: number,
  options: { min: number; max: number } = { min: 260, max: 400 },
) => {
  return screenWidth > options.min && screenWidth < options.max ? screenWidth : defaultWidth;
};
