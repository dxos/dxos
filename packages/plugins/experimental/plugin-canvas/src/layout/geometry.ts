//
// Copyright 2024 DXOS.org
//

import { type CSSProperties } from 'react';

import { invariant } from '@dxos/invariant';

// TODO(burdon): Utils?
//  - https://www.npmjs.com/package/@antv/coord
//  - https://github.com/antvis/G6
//  - https://observablehq.com/@antv/wow-antv-coord
//  - https://github.com/antvis/coord/blob/master/docs/api/README.md
//  - https://www.npmjs.com/package/geometric

// TODO(burdon): Generalize positional unit (e.g., x,y, fraction, slot).

export type Point = { x: number; y: number };
export type Dimension = { width: number; height: number };
export type Rect = Point & Dimension;
export type Line = [Point, Point];
export type Range = { p1: Point; p2: Point }; // TODO(burdon): Array.

export type PointTransform = (pos: Point) => Point;

// TODO(burdon): Namespace for functions?

//
// Point
//

export const round = (n: number, m: number) => Math.round(n / m) * m;

export const pointAdd = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
export const pointSubtract = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });

export const distance = (p1: Point, p2: Point): number =>
  Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

//
// Rect
//

export const getCenter = (rect: Rect): Point => ({
  x: rect.x + rect.width / 2,
  y: rect.y + rect.height / 2,
});

export const getRect = (center: Point, size: Dimension): Rect => ({
  x: center.x - size.width / 2,
  y: center.y - size.height / 2,
  ...size,
});

export const getBounds = (p1: Point, p2: Point): Rect => ({
  x: Math.min(p1.x, p2.x),
  y: Math.min(p1.y, p2.y),
  width: Math.abs(p1.x - p2.x),
  height: Math.abs(p1.y - p2.y),
});

export const pointsToRect = ([p1, p2]: Point[]): Rect => {
  return getBounds(p1, p2);
};

export const rectToPoints = (rect: Rect): Point[] => [
  { x: rect.x, y: rect.y },
  { x: rect.x + rect.width, y: rect.y + rect.height },
];

export const rectUnion = (rect: Rect[]): Rect => {
  invariant(rect.length > 0);
  const x = Math.min(...rect.map((b) => b.x));
  const y = Math.min(...rect.map((b) => b.y));
  const width = Math.max(...rect.map((b) => b.x + b.width)) - x;
  const height = Math.max(...rect.map((b) => b.y + b.height)) - y;
  return { x, y, width, height };
};

export const rectOverlaps = (b1: Rect, b2: Rect): boolean =>
  !(b1.x + b1.width <= b2.x || b1.x >= b2.x + b2.width || b1.y + b1.height <= b2.y || b1.y >= b2.y + b2.height);

export const rectContains = (b1: Rect, b2: Rect): boolean =>
  b2.x >= b1.x && b2.y >= b1.y && b2.x + b2.width <= b1.x + b1.width && b2.y + b2.height <= b1.y + b1.height;

//
// Intersections
//

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
  // Rectangle sides represented as lines.
  const { x, y, width, height } = rect;
  const sides: Line[] = [
    // Top.
    [
      { x, y },
      { x: x + width, y },
    ],
    // Right.
    [
      { x: x + width, y },
      { x: x + width, y: y + height },
    ],
    // Bottom.
    [
      { x, y: y + height },
      { x: x + width, y: y + height },
    ],
    // Left.
    [
      { x, y },
      { x, y: y + height },
    ],
  ];

  // Find intersections with each rectangle side.
  const intersections: Point[] = [];
  for (const side of sides) {
    const intersection = findLineIntersection(line, side);
    if (intersection) {
      intersections.push(intersection);
    }
  }

  return intersections;
};

/**
 * Line1 is represented as: a + t(b-a), where t is between 0 and 1.
 * Line2 is represented as: c + s(d-c), where s is between 0 and 1.
 */
export const findLineIntersection = ([p1, p2]: Line, [q1, q2]: Line): Point | null => {
  // Calculate denominator first to check if lines are parallel.
  const denominator = (p2.x - p1.x) * (q2.y - q1.y) - (p2.y - p1.y) * (q2.x - q1.x);

  // If denominator is 0, lines are parallel.
  if (Math.abs(denominator) < 1e-10) {
    return null;
  }

  // Calculate intersection parameters.
  const t = ((q1.x - p1.x) * (q2.y - q1.y) - (q1.y - p1.y) * (q2.x - q1.x)) / denominator;
  const s = ((q1.x - p1.x) * (p2.y - p1.y) - (q1.y - p1.y) * (p2.x - p1.x)) / denominator;

  // Check if intersection occurs within both line segments.
  if (t < 0 || t > 1 || s < 0 || s > 1) {
    return null;
  }

  // Calculate intersection point.
  return {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y),
  };
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