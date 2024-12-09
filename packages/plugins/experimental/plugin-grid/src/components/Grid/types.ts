//
// Copyright 2024 DXOS.org
//

import { type DragLocationHistory } from '@atlaskit/pragmatic-drag-and-drop/types';
import { type CSSProperties } from 'react';

// TODO(burdon): Generalize positional unit (e.g., x,y, fraction, slot).
export type Point = { x: number; y: number };
export type Dimension = { width: number; height: number };

export type Item = {
  id: string;
  pos: Point;
  size: Dimension;
};

export const getPoint = (pos: Point, { initial, current }: DragLocationHistory): Point => {
  const ix = initial.input.clientX - pos.x;
  const iy = initial.input.clientY - pos.y;
  return {
    x: current.input.clientX - ix,
    y: current.input.clientY - iy,
  };
};

export const getPositionStyle = (pos: Point, size: Dimension): CSSProperties => ({
  left: `${pos.x - size.width / 2}px`,
  top: `${pos.y - size.height / 2}px`,
  width: `${size.width}px`,
  height: `${size.height}px`,
});

export const createPathFromPoints = (points: Point[]): string => {
  if (points.length < 2) {
    return '';
  }

  const [start, ...rest] = points;
  const path = [`M ${start.x},${start.y}`];
  for (let i = 0; i < rest.length - 1; i++) {
    const p1 = rest[i];
    const p2 = rest[i + 1];
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    path.push(`Q ${p1.x},${p1.y} ${midX},${midY}`);
  }

  const last = rest[rest.length - 1];
  path.push(`T ${last.x},${last.y}`);

  return path.join(' ');
};

export const createPathThroughPoints = (points: Point[]): string => {
  if (points.length < 2) {
    return '';
  }

  const [start, ...rest] = points;
  const path = [`M ${start.x},${start.y}`];

  for (let i = 0; i < rest.length; i++) {
    const p0 = i === 0 ? start : points[i];
    const p1 = rest[i];
    const cpx = (p0.x + p1.x) / 2;
    const cpy = (p0.y + p1.y) / 2;

    path.push(`Q ${cpx},${cpy} ${p1.x},${p1.y}`);
  }

  return path.join(' ');
};
