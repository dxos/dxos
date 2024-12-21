//
// Copyright 2024 DXOS.org
//

import { type Point } from '@dxos/react-ui-canvas';

import { createPathThroughPoints } from '../layout';
import { type LineShape, type PolygonShape, type RectangleShape, type Shape } from '../types';

export type ShapeKind = 'rect' | 'line';

type CommonProps = Pick<Shape, 'id' | 'guide' | 'text'>;

type RectProps = CommonProps & Pick<PolygonShape, 'center' | 'size'>;

export const createRectangle = ({ id, ...rest }: RectProps): RectangleShape => ({
  id,
  type: 'rectangle',
  ...rest,
});

type LineProps = CommonProps &
  Pick<LineShape, 'start' | 'end'> & {
    p1: Point;
    p2: Point;
  };

export const createLine = ({ id, p1, p2, ...rest }: LineProps): LineShape => ({
  id,
  type: 'line',
  path: createPathThroughPoints([p1, p2]),
  ...rest,
});
