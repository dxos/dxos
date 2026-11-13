//
// Copyright 2026 DXOS.org
//

//
// Recognising a shape in a stroke drawn freehand. A stroke that comes back to where it began is compared with each
// shape the canvas can draw in its place, laid over the stroke's own bounds: the one it lies closest to, if it is
// close enough, is the shape meant. The measure runs both ways (the stroke to the shape, and the shape to the stroke),
// so a scribble along one side of its bounds is no rectangle.
//

import { type Bounds, type Point, type Size } from '@dxos/scene';

/** A shape a stroke was read as, and the box it was drawn in. */
export type RecognizedShape = {
  shape: 'rect' | 'ellipse' | 'triangle' | 'diamond';
  bounds: Bounds;
  /** Degrees clockwise a triangle's point is turned from the top; unset, it points up. */
  rotation?: 90 | 180 | 270;
};

/** A stroke shorter than this many samples says too little to read. */
const MIN_POINTS = 8;

/** How far from its start a stroke may end and still count as closed, as a share of its bounds' diagonal. */
const CLOSURE = 0.25;

/** How far off a shape's outline a stroke may lie on average and still be that shape, as a share of the diagonal. */
const TOLERANCE = 0.045;

/** How far each side of a drawn shape may be from a known size's and still be meant as it, as a share of that side. */
const SIZE_TOLERANCE = 0.25;

/**
 * `size`, or the first of `known` it is close to on both sides. A shape drawn by hand is the size the hand happened
 * to make it: one nearly the size of the last such shape, or of the tool's own, was meant to match it.
 */
export const nearestSize = (size: Size, known: readonly (Size | undefined)[], tolerance = SIZE_TOLERANCE): Size =>
  known.find(
    (candidate): candidate is Size =>
      candidate !== undefined &&
      Math.abs(size.width - candidate.width) <= tolerance * candidate.width &&
      Math.abs(size.height - candidate.height) <= tolerance * candidate.height,
  ) ?? size;

/**
 * `value` on the grid, a major line where one is within a minor cell of it and the nearest minor line otherwise. A
 * shape read from a stroke is squared up, and a hand aiming at a heavy line of the grid lands near it, not on it.
 */
export const favorMajor = (value: number, minor: number, major: number): number => {
  const heavy = Math.round(value / major) * major;
  return Math.abs(value - heavy) <= minor ? heavy : Math.round(value / minor) * minor;
};

/** Points along a shape's outline the stroke is checked against. */
const OUTLINE_SAMPLES = 64;

/** How finely an ellipse is drawn as a polygon to measure against. */
const ELLIPSE_SIDES = 48;

const distance = (from: Point, to: Point): number => Math.hypot(to.x - from.x, to.y - from.y);

/** How far `point` is from the segment between `from` and `to`. */
const toSegment = (point: Point, from: Point, to: Point): number => {
  const [dx, dy] = [to.x - from.x, to.y - from.y];
  const length = dx * dx + dy * dy;
  const along =
    length === 0 ? 0 : Math.min(1, Math.max(0, ((point.x - from.x) * dx + (point.y - from.y) * dy) / length));
  return distance(point, { x: from.x + along * dx, y: from.y + along * dy });
};

/** How far `point` is from a closed line through `ring`. */
const toRing = (point: Point, ring: readonly Point[]): number =>
  Math.min(...ring.map((vertex, index) => toSegment(point, vertex, ring[(index + 1) % ring.length])));

/** `count` points spaced evenly along a closed line through `ring`. */
const alongRing = (ring: readonly Point[], count: number): Point[] => {
  const edges = ring.map((vertex, index) => ({ from: vertex, to: ring[(index + 1) % ring.length] }));
  const lengths = edges.map(({ from, to }) => distance(from, to));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  return Array.from({ length: count }, (_, index) => {
    let travel = (index / count) * total;
    const edge = lengths.findIndex((length) => {
      if (travel <= length) {
        return true;
      }
      travel -= length;
      return false;
    });
    const { from, to } = edges[Math.max(edge, 0)];
    const share = lengths[Math.max(edge, 0)] === 0 ? 0 : travel / lengths[Math.max(edge, 0)];
    return { x: from.x + (to.x - from.x) * share, y: from.y + (to.y - from.y) * share };
  });
};

const mean = (values: readonly number[]): number => values.reduce((sum, value) => sum + value, 0) / values.length;

const boundsOf = (points: readonly Point[]): Bounds => {
  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  const [left, top] = [Math.min(...xs), Math.min(...ys)];
  return { x: left, y: top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
};

/** Each shape a stroke may be, as the closed line it draws in `bounds`. */
const candidates = ({ x, y, width, height }: Bounds): (Omit<RecognizedShape, 'bounds'> & { ring: Point[] })[] => {
  const [right, bottom] = [x + width, y + height];
  const [midX, midY] = [x + width / 2, y + height / 2];
  const [nw, ne, se, sw] = [
    { x, y },
    { x: right, y },
    { x: right, y: bottom },
    { x, y: bottom },
  ];
  const [north, east, south, west] = [
    { x: midX, y },
    { x: right, y: midY },
    { x: midX, y: bottom },
    { x, y: midY },
  ];
  return [
    { shape: 'rect', ring: [nw, ne, se, sw] },
    {
      shape: 'ellipse',
      ring: Array.from({ length: ELLIPSE_SIDES }, (_, index) => {
        const angle = (index / ELLIPSE_SIDES) * 2 * Math.PI;
        return { x: midX + (width / 2) * Math.cos(angle), y: midY + (height / 2) * Math.sin(angle) };
      }),
    },
    { shape: 'diamond', ring: [north, east, south, west] },
    { shape: 'triangle', ring: [north, se, sw] },
    { shape: 'triangle', rotation: 90, ring: [east, sw, nw] },
    { shape: 'triangle', rotation: 180, ring: [south, nw, ne] },
    { shape: 'triangle', rotation: 270, ring: [west, ne, se] },
  ];
};

/**
 * The shape a stroke through `points` draws, or none: a stroke left open, one too short or too small to read, and one
 * that lies near no shape's outline are all a line and nothing more. `minimum` is the smallest side worth a shape.
 */
export const recognizeShape = (points: readonly Point[], minimum = 0): RecognizedShape | undefined => {
  if (points.length < MIN_POINTS) {
    return undefined;
  }
  const bounds = boundsOf(points);
  const diagonal = Math.hypot(bounds.width, bounds.height);
  if (bounds.width < minimum || bounds.height < minimum || diagonal === 0) {
    return undefined;
  }
  if (distance(points[0], points[points.length - 1]) > CLOSURE * diagonal) {
    return undefined;
  }
  const scored = candidates(bounds).map(({ ring, ...shape }) => {
    const drawn = mean(points.map((point) => toRing(point, ring)));
    const covered = mean(alongRing(ring, OUTLINE_SAMPLES).map((point) => toRing(point, points)));
    return { shape, error: (drawn + covered) / 2 / diagonal };
  });
  const best = scored.reduce((least, candidate) => (candidate.error < least.error ? candidate : least));
  return best.error <= TOLERANCE ? { ...best.shape, bounds } : undefined;
};
