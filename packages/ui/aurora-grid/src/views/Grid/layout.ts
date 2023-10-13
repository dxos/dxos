//
// Copyright 2023 DXOS.org
//

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

export type Dimension = { width: number; height: number };

export type Position = { x: number; y: number };

export type Bounds = { left: number; top: number; width: number; height: number };

export const getDimension = ({ width, height }: Dimension, spacing = 0): Dimension => ({
  width: width - spacing * 2,
  height: height - spacing * 2,
});

export const getBounds = ({ x, y }: Position, { width, height }: Dimension, spacing = 0): Bounds => ({
  left: x * width + spacing * 2,
  top: y * height + spacing * 2,
  width: width - spacing * 2,
  height: height - spacing * 2,
});

export const getPanelBounds = ({ x, y }: Position, { width, height }: Dimension, spacing = 0): Dimension => ({
  width: x * width + spacing * 2,
  height: y * height + spacing * 2,
});

export const calculateCellWidth = (
  defaultWidth: number,
  screenWidth: number,
  options: { min: number; max: number } = { min: 260, max: 400 },
) => {
  return screenWidth > options.min && screenWidth < options.max ? screenWidth : defaultWidth;
};
