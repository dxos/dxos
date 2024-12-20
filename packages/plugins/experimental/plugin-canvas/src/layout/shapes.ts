//
// Copyright 2024 DXOS.org
//

import { createPathThroughPoints } from '../layout';
import { type Dimension, type LineShape, type Point, type RectangleShape, type Shape } from '../types';

export type ShapeKind = 'rect' | 'line';

type CommonProps = Pick<Shape, 'id'>;

type RectProps = CommonProps & {
  center: Point;
  size: Dimension;
  text?: string;
};

export const createRect = ({ id, center, size, ...rest }: RectProps): RectangleShape => ({
  id,
  type: 'rectangle',
  center,
  size,
  ...rest,
});

type LineProps = CommonProps & {
  p1: Point;
  p2: Point;
  start?: string;
  end?: string;
};

export const createLine = ({ id, p1, p2, ...rest }: LineProps): LineShape => ({
  id,
  type: 'line',
  path: createPathThroughPoints([p1, p2]),
  ...rest,
});
