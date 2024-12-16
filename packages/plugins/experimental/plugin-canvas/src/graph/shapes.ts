//
// Copyright 2024 DXOS.org
//

import { createPathThroughPoints, type Dimension, getBounds, getRect, type Point, type Rect } from '../layout';

export type ShapeKind = 'rect' | 'line';

export type BaseShape<T extends object = any> = {
  id: string;
  type: ShapeKind;
  rect: Rect;
  data?: T;

  // TODO(burdon): Display kind.
  guide?: boolean;
};

// TODO(burdon): Define schema for persistent objects.
export type Shape =
  | (BaseShape & {
      type: 'rect';
      text?: string;
      pos: Point;
      size: Dimension;
    })
  | (BaseShape & {
      type: 'line';
      path: string;
      start?: string;
      end?: string;
    });

export type ShapeType<K = ShapeKind, T extends object = any> = BaseShape<T> & Shape & { type: K };

type CommonProps = Pick<BaseShape, 'id' | 'guide'>;

type RectProps = CommonProps & {
  pos: Point;
  size: Dimension;
  text?: string;
};

export const createRect = ({ id, pos, size, ...rest }: RectProps): ShapeType<'rect'> => ({
  id,
  type: 'rect',
  rect: getBounds(pos, size),
  pos,
  size,
  ...rest,
});

type LineProps = CommonProps & {
  p1: Point;
  p2: Point;
  start?: string;
  end?: string;
};

export const createLine = ({ id, p1, p2, ...rest }: LineProps): ShapeType<'line'> => ({
  id,
  type: 'line',
  rect: getRect(p1, p2),
  path: createPathThroughPoints([p1, p2]),
  ...rest,
});
