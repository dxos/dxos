//
// Copyright 2024 DXOS.org
//

import { createPathThroughPoints, type Dimension, getBounds, getRect, type Point, type Rect } from '../layout';

type BaseShape = {
  id: string;
  type: 'rect' | 'line';
  rect: Rect;

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
    });

type CommonProps = Pick<BaseShape, 'id' | 'guide'>;

type RectProps = CommonProps & {
  pos: Point;
  size: Dimension;
  text?: string;
};

export const createRect = ({ id, pos, size, text, guide }: RectProps): Shape => ({
  id,
  type: 'rect',
  rect: getBounds(pos, size),
  pos,
  size,
  text,
  guide,
});

type LineProps = CommonProps & {
  p1: Point;
  p2: Point;
};

export const createLine = ({ id, p1, p2, guide }: LineProps): Shape => ({
  id,
  type: 'line',
  rect: getRect(p1, p2),
  path: createPathThroughPoints([p1, p2]),
  guide,
});
