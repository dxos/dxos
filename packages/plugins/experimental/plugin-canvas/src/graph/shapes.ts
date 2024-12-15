//
// Copyright 2024 DXOS.org
//

import { createPathThroughPoints, type Dimension, getBounds, getRect, type Point, type Rect } from '../layout';

type ShapeCommon = {
  id: string;
  type: 'rect' | 'line';
  rect: Rect;
};

// TODO(burdon): Define schema for persistent objects.
export type Shape =
  | (ShapeCommon & {
      type: 'rect';
      text?: string;
      pos: Point;
      size: Dimension;
    })
  | (ShapeCommon & {
      type: 'line';
      path: string;
    });

export const createRect = ({
  id,
  pos,
  size,
  text,
}: {
  id: string;
  pos: Point;
  size: Dimension;
  text?: string;
}): Shape => ({
  id,
  type: 'rect',
  rect: getBounds(pos, size),
  pos,
  size,
  text,
});

export const createLine = ({ id, p1, p2 }: { id: string; p1: Point; p2: Point }): Shape => ({
  id,
  type: 'line',
  rect: getRect(p1, p2),
  path: createPathThroughPoints([p1, p2]),
});
