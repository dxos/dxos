//
// Copyright 2024 DXOS.org
//

import { type CSSProperties } from 'react';

// TODO(burdon): Generalize positional unit (e.g., x,y, fraction, slot).
export type Point = { x: number; y: number };
export type Line = [Point, Point];
export type Range = { p1: Point; p2: Point };
export type Bounds = { center: Point; size: Dimension };
export type Dimension = { width: number; height: number };
export type Rect = Point & Dimension;

export type PointTransform = (pos: Point) => Point;

//
// Points
//

export const round = (n: number, m: number) => Math.round(n / m) * m;

export const pointAdd = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
export const pointSubtract = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
export const pointMultiply = (pos: Point, scale: number): Point => ({ x: pos.x * scale, y: pos.y * scale });

export const distance = (p1: Point, p2: Point): number =>
  Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

//
// Bounds
//

export const getBounds = (center: Point, size: Dimension): Rect => ({
  x: center.x - size.width / 2,
  y: center.y - size.height / 2,
  ...size,
});

export const getRect = (p1: Point, p2: Point): Rect => ({
  x: Math.min(p1.x, p2.x),
  y: Math.min(p1.y, p2.y),
  width: Math.abs(p1.x - p2.x),
  height: Math.abs(p1.y - p2.y),
});

export const rectOverlap = (b1: Rect, b2: Rect): boolean =>
  !(b1.x + b1.width <= b2.x || b1.x >= b2.x + b2.width || b1.y + b1.height <= b2.y || b1.y >= b2.y + b2.height);

export const boundsContain = (b1: Rect, b2: Rect): boolean =>
  b2.x >= b1.x && b2.y >= b1.y && b2.x + b2.width <= b1.x + b1.width && b2.y + b2.height <= b1.y + b1.height;

export const findClosestIntersection = ([p1, p2]: Line, rect: Rect): Point | null => {
  const intersections = findLineRectangleIntersections([p1, p2], rect);
  if (intersections.length === 0) {
    return null;
  }

  // Find the closest intersection point to the line's p1.
  return intersections.reduce((closest, point) => {
    const closestDistance = distance(p1, closest);
    const currentDistance = distance(p1, point);
    return currentDistance < closestDistance ? point : closest;
  });
};

export const findLineRectangleIntersections = (line: Line, rect: Rect): Point[] => {
  const { x, y, width, height } = rect;

  // Rectangle sides represented as lines.
  const rectSides: Line[] = [
    [
      { x, y },
      { x: x + width, y },
    ],
    [
      { x: x + width, y },
      { x: x + width, y: y + height },
    ],
    [
      { x: x + width, y: y + height },
      { x, y: y + height },
    ],
    [
      { x, y: y + height },
      { x, y },
    ],
  ];

  // Find intersections with each rectangle side.
  const intersections: Point[] = [];
  for (const side of rectSides) {
    const intersection = findLineIntersection(line, side);
    if (intersection) {
      intersections.push(intersection);
    }
  }

  return intersections;
};

export const findLineIntersection = ([p1, p2]: Line, [q1, q2]: Line): Point | null => {
  const a1 = p2.y - p1.y;
  const b1 = p1.x - p2.x;
  const c1 = a1 * p1.x + b1 * p1.y;

  const a2 = q2.y - q1.y;
  const b2 = q1.x - q2.x;
  const c2 = a2 * q1.x + b2 * q1.y;

  // Check if parallel or coincident.
  const determinant = a1 * b2 - a2 * b1;
  if (determinant === 0) {
    return null;
  }

  const x = (b2 * c1 - b1 * c2) / determinant;
  const y = (a1 * c2 - a2 * c1) / determinant;

  // Check if the intersection point lies on both line segments.
  if (isPointOnSegment({ x, y }, [p1, p2]) && isPointOnSegment({ x, y }, [q1, q2])) {
    return { x, y };
  }

  return null;
};

export const isPointOnSegment = ({ x, y }: Point, [p1, p2]: Line): boolean => {
  return (
    Math.min(p1.x, p2.x) <= x && x <= Math.max(p1.x, p2.x) && Math.min(p1.y, p2.y) <= y && y <= Math.max(p1.y, p2.y)
  );
};

//
// Transform
// Screen vs. model transforms.
//

/**
 * Maps the pointer to the element's transformed coordinate system.
 */
export const boundsToModel = (
  rect: DOMRect,
  scale: number,
  offset: Point,
  { x = 0, y = 0, width = 0, height = 0 }: Partial<Rect>,
): Rect => ({
  x: (x - rect.left - offset.x) / scale,
  y: (y - rect.top - offset.y) / scale,
  width: width / scale,
  height: height / scale,
});

/**
 * Maps the pointer to the element's transformed coordinate system, taking account of the starting offset
 * from the shape's reference point (typically the center).
 *
 * @param rect Bounds of container
 * @param scale Container scale.
 * @param offset Container offset.
 * @param center Center point of shape.
 * @param initial Cursor position on start of drag.
 * @param current Current position.
 */
export const boundsToModelWithOffset = (
  rect: DOMRect,
  scale: number,
  offset: Point,
  center: Point,
  initial: Point,
  current: Point,
) => {
  const initialPoint = boundsToModel(rect, scale, offset, initial);
  const currentPoint = boundsToModel(rect, scale, offset, current);
  return pointAdd(currentPoint, pointSubtract(center, initialPoint));
};

//
// CSS
//

export const getBoundsProperties = ({ x, y, width, height }: Rect): CSSProperties => ({
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
