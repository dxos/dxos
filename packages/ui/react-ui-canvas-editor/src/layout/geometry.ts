//
// Copyright 2024 DXOS.org
//

import { curveCatmullRom, line } from 'd3';
import { type CSSProperties } from 'react';

import { invariant } from '@dxos/invariant';
import { type Dimension, type Point, type Rect } from '@dxos/react-ui-canvas';

// TODO(burdon): Utils?
//  - https://www.npmjs.com/package/@antv/coord
//  - https://github.com/antvis/G6
//  - https://observablehq.com/@antv/wow-antv-coord
//  - https://github.com/antvis/coord/blob/master/docs/api/README.md
//  - https://www.npmjs.com/package/geometric

export type Line = [Point, Point];
export type Range = { p1: Point; p2: Point }; // TODO(burdon): Array.

export type PointTransform = (pos: Point) => Point;

// TODO(burdon): Namespace functions (e.g., Point.add(a, b)).
// TODO(burdon): Factor out low-level SVG package.

export const round = (n: number, m: number) => Math.round(n / m) * m;

//
// Point
//

export const pointAdd = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
export const pointSubtract = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
export const pointMultiply = (a: Point, b = 1): Point => ({ x: a.x * b, y: a.y * b });
export const pointDivide = (a: Point, b = 1): Point => ({ x: a.x / b, y: a.y / b });
export const pointMid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export const pointEqual = (a?: Point, b?: Point): boolean => a?.x === b?.x && a?.y === b?.y;
export const pointRound = (point: Point): Point => ({ x: Math.round(point.x), y: Math.round(point.y) });

export const getDistance = (p1: Point, p2: Point): number =>
  Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

//
// Rect
//

export const getCenter = (rect: Partial<Rect>): Point => ({
  x: (rect.x ?? 0) + (rect.width ?? 0) / 2,
  y: (rect.y ?? 0) + (rect.height ?? 0) / 2,
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
// CSS
//

export const getBoundsProperties = ({ x, y, width, height }: Rect): CSSProperties => ({
  left: `${x - width / 2}px`,
  top: `${y - height / 2}px`,
  width: `${width}px`,
  height: `${height}px`,
});

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
    const closestDistance = getDistance(p1, closest);
    const currentDistance = getDistance(p1, point);
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
  // Calculate denominator first to check if lines are parallel; if 0, then lines are parallel.
  const denominator = (p2.x - p1.x) * (q2.y - q1.y) - (p2.y - p1.y) * (q2.x - q1.x);
  if (Math.abs(denominator) < 1e-10) {
    return null;
  }

  // Check if intersection occurs within both line segments.
  const t = ((q1.x - p1.x) * (q2.y - q1.y) - (q1.y - p1.y) * (q2.x - q1.x)) / denominator;
  const s = ((q1.x - p1.x) * (p2.y - p1.y) - (q1.y - p1.y) * (p2.x - p1.x)) / denominator;
  if (t < 0 || t > 1 || s < 0 || s > 1) {
    return null;
  }

  // Intersection point.
  return {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y),
  };
};

//
// SVG Paths
//

export const createPathThroughPoints = (points: Point[], smooth = true): string => {
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
    // Q = Quadratic Bézier curve.
    path.push(`Q ${p1.x},${p1.y} ${midX},${midY}`);
  }

  // T = Smooth quadratic Bézier curve.
  const last = rest[rest.length - 1];
  path.push(`T ${last.x},${last.y}`);
  return path.join(' ');
};

// TODO(burdon): Reconcile with above.
export const createPathThroughPoints2 = (points: Point[]): string => {
  if (points.length < 2) {
    return '';
  }

  const [start, ...rest] = points;
  const path = [`M ${start.x},${start.y}`];
  for (let i = 0; i < rest.length; i++) {
    const p1 = i === 0 ? start : points[i];
    const p2 = rest[i];
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    path.push(`Q ${midX},${midY} ${p2.x},${p2.y}`);
  }

  return path.join(' ');
};

/**
 * https://d3js.org/d3-shape/curve
 */
const curveGenerator = line<Point>()
  // .curve(curveBasis)
  // .curve(curveBundle)
  .curve(curveCatmullRom.alpha(0.9))
  .x((d) => d.x)
  .y((d) => d.y);

export const createCurveThroughPoints = (points: Point[]): string => {
  invariant(points.length >= 2);
  return curveGenerator(points)!;
};

export const createNormalsFromRectangles = (r1: Rect, r2: Rect, len = 32): [Point[], Point[]] | undefined => {
  const sidesR1 = {
    left: [
      { x: r1.x, y: r1.y },
      { x: r1.x, y: r1.y + r1.height },
    ],
    right: [
      { x: r1.x + r1.width, y: r1.y },
      { x: r1.x + r1.width, y: r1.y + r1.height },
    ],
    top: [
      { x: r1.x, y: r1.y },
      { x: r1.x + r1.width, y: r1.y },
    ],
    bottom: [
      { x: r1.x, y: r1.y + r1.height },
      { x: r1.x + r1.width, y: r1.y + r1.height },
    ],
  };

  const sidesR2 = {
    left: [
      { x: r2.x, y: r2.y },
      { x: r2.x, y: r2.y + r2.height },
    ],
    right: [
      { x: r2.x + r2.width, y: r2.y },
      { x: r2.x + r2.width, y: r2.y + r2.height },
    ],
    top: [
      { x: r2.x, y: r2.y },
      { x: r2.x + r2.width, y: r2.y },
    ],
    bottom: [
      { x: r2.x, y: r2.y + r2.height },
      { x: r2.x + r2.width, y: r2.y + r2.height },
    ],
  };

  const distances = [];

  // Check horizontal facing sides.
  if (r1.x + r1.width <= r2.x) {
    distances.push({
      pair: [sidesR1.right, sidesR2.left],
      distance: Math.abs(r1.x + r1.width - r2.x),
    });
  } else if (r2.x + r2.width <= r1.x) {
    distances.push({
      pair: [sidesR1.left, sidesR2.right],
      distance: Math.abs(r2.x + r2.width - r1.x),
    });
  }

  // Bias horizontal unless too close.
  const d = distances.length
    ? distances.reduce((max, curr) => (curr.distance > max.distance ? curr : max)).distance
    : 0;
  if (d < len * 2) {
    // Check vertical facing sides.
    if (r1.y + r1.height <= r2.y) {
      distances.push({
        pair: [sidesR1.bottom, sidesR2.top],
        distance: Math.abs(r1.y + r1.height - r2.y),
      });
    } else if (r2.y + r2.height <= r1.y) {
      distances.push({
        pair: [sidesR1.top, sidesR2.bottom],
        distance: Math.abs(r2.y + r2.height - r1.y),
      });
    }
  }

  if (distances.length) {
    const [side1, side2] = distances.reduce((max, curr) => (curr.distance > max.distance ? curr : max)).pair;

    const isVertical1 = side1[0].x === side1[1].x;
    const isVertical2 = side2[0].x === side2[1].x;

    const direction1 = isVertical1 ? (side1[0].x < side2[0].x ? -1 : 1) : side1[0].y < side2[0].y ? -1 : 1;
    const direction2 = isVertical2 ? (side2[0].x < side1[0].x ? -1 : 1) : side2[0].y < side1[0].y ? -1 : 1;

    return [
      createPerpendicularLine(side1, isVertical1, direction1, len),
      createPerpendicularLine(side2, isVertical2, direction2, len),
    ];
  }
};

// Generate lines perpendicular to the sides and pointing away.
const createPerpendicularLine = (side: Point[], vertical: boolean, away: 1 | -1, len: number): Line => {
  const midPoint: Point = {
    x: (side[0].x + side[1].x) / 2,
    y: (side[0].y + side[1].y) / 2,
  };

  if (vertical) {
    return [{ x: midPoint.x - len * away, y: midPoint.y }, midPoint];
  } else {
    return [{ x: midPoint.x, y: midPoint.y - len * away }, midPoint];
  }
};
