//
// Copyright 2024 DXOS.org
//

import { type Point } from '@dxos/react-ui-canvas';

import { createSplineThroughPoints, createPathThroughPoints } from '../layout';
import { type EllipseShape, type LineShape, type PolygonShape, type RectangleShape, type Shape } from '../types';

export type ShapeKind = 'rect' | 'line';

type CommonProps = Pick<Shape, 'id' | 'guide' | 'text'>;

//
// Rectangle
//

type RectangleProps = CommonProps & Pick<PolygonShape, 'center' | 'size'>;

export const createRectangle = ({ id, ...rest }: RectangleProps): RectangleShape => ({
  id,
  type: 'rectangle',
  ...rest,
});

//
// Ellipse
//

type EllipseProps = CommonProps & Pick<PolygonShape, 'center' | 'size'>;

export const createEllipse = ({ id, ...rest }: EllipseProps): EllipseShape => ({
  id,
  type: 'ellipse',
  ...rest,
});

//
// Line
//

type LineProps = CommonProps &
  Pick<LineShape, 'start' | 'end'> & {
    points: Point[];
  };

export const createLine = ({ id, points, ...rest }: LineProps): LineShape => ({
  id,
  type: 'line',
  path: points.length === 2 ? createPathThroughPoints(points) : createSplineThroughPoints(points),
  ...rest,
});
