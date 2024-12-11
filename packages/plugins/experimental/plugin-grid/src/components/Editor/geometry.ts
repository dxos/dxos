//
// Copyright 2024 DXOS.org
//

import { type DragLocationHistory, type Input } from '@atlaskit/pragmatic-drag-and-drop/types';
import { type CSSProperties } from 'react';

// TODO(burdon): Generalize positional unit (e.g., x,y, fraction, slot).
export type Point = { x: number; y: number };
export type Dimension = { width: number; height: number };
export type Bounds = Point & Dimension;
export type Range = { p1: Point; p2: Point };

export type PointTransform = (pos: Point) => Point;

//
// Points
//

export const round = (n: number, m: number) => Math.round(n / m) * m;

export const createSnap = (snap?: Dimension): PointTransform =>
  snap
    ? (pos: Point): Point => ({
        x: round(pos.x, snap.width),
        y: round(pos.y, snap.height),
      })
    : (pos: Point) => pos;

export const pointAdd = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
export const pointSubtract = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
export const pointMultiply = (pos: Point, scale: number): Point => ({ x: pos.x * scale, y: pos.y * scale });

export const getInputPoint = (input: Input) => ({
  x: input.clientX,
  y: input.clientY,
});

//
// Bounds
//

export const getBounds = (p1: Point, p2: Point): Bounds => ({
  x: Math.min(p1.x, p2.x),
  y: Math.min(p1.y, p2.y),
  width: Math.abs(p1.x - p2.x),
  height: Math.abs(p1.y - p2.y),
});

export const boundsOverlap = (b1: Bounds, b2: Bounds): boolean =>
  !(b1.x + b1.width <= b2.x || b1.x >= b2.x + b2.width || b1.y + b1.height <= b2.y || b1.y >= b2.y + b2.height);

export const boundsContain = (b1: Bounds, b2: Bounds): boolean =>
  b2.x >= b1.x && b2.y >= b1.y && b2.x + b2.width <= b1.x + b1.width && b2.y + b2.height <= b1.y + b1.height;

//
// Transform
// Screen vs. model transforms.
//

/**
 * Maps the pointer event to the element's transformed coordinate system.
 */
export const boundsToModel = (rect: DOMRect, scale: number, offset: Point, bounds: Partial<Bounds>): Bounds => ({
  x: ((bounds.x ?? 0) - rect.left - offset.x) / scale,
  y: ((bounds.y ?? 0) - rect.top - offset.y) / scale,
  width: (bounds.width ?? 0) / scale,
  height: (bounds.height ?? 0) / scale,
});

export const boundToModelWithOffset = (
  rect: DOMRect,
  scale: number,
  offset: Point,
  location: DragLocationHistory,
  center: Point,
) => {
  const initial = boundsToModel(rect, scale, offset, getInputPoint(location.initial.input));
  const current = boundsToModel(rect, scale, offset, getInputPoint(location.current.input));
  return pointAdd(current, pointSubtract(center, initial));
};

//
// CSS
//

export const getBoundsProperties = ({ x, y, width, height }: Bounds): CSSProperties => ({
  left: `${x - width / 2}px`,
  top: `${y - height / 2}px`,
  width: `${width}px`,
  height: `${height}px`,
});

//
// SVG Paths
//

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
