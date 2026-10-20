//
// Copyright 2026 DXOS.org
//

import { type Bounds, type Point, type Size } from '../model/index.ts';

/** How near a placed vertex a press must be, in screen px, to land on it: on the first, it closes the line. */
export const VERTEX_SNAP_PX = 8;

/** Default vertices of a new polyline, in unit space: a zig-zag across the frame. */
export const DEFAULT_POLYLINE_POINTS: readonly Point[] = [
  { x: 0, y: 1 },
  { x: 1 / 3, y: 0 },
  { x: 2 / 3, y: 1 },
  { x: 1, y: 0 },
];

const round = (value: number) => Math.round(value * 100) / 100;

/** One axis of the frame: the points' extent, widened about its centre to `minimum`. */
const span = (values: readonly number[], minimum: number): [number, number] => {
  const low = Math.min(...values);
  const high = Math.max(...values);
  const extent = Math.max(high - low, minimum);
  return [(low + high) / 2 - extent / 2, extent];
};

/**
 * The frame of a polyline drawn through scene `points` and those points in its unit space (0..1 of the frame, origin
 * top-left). Each side is at least `minimum`, so a straight line still has a frame to scale.
 */
export const polylineFrame = (
  points: readonly Point[],
  minimum = 0,
): { bounds: Bounds; points: Point[] } | undefined => {
  if (points.length === 0) {
    return undefined;
  }
  const [x, width] = span(
    points.map(({ x }) => x),
    minimum,
  );
  const [y, height] = span(
    points.map(({ y }) => y),
    minimum,
  );
  const unit = (value: number, origin: number, extent: number) => (extent > 0 ? (value - origin) / extent : 0.5);
  return {
    bounds: { x, y, width, height },
    points: points.map((point) => ({ x: unit(point.x, x, width), y: unit(point.y, y, height) })),
  };
};

export type PolylinePathOptions = {
  /** Joins the last vertex back to the first. */
  closed?: boolean;
  /** Px kept inside the frame, so a stroke twice that wide stays within it. */
  inset?: number;
  /** Px each corner is rounded by, no larger than half of either adjacent edge allows. */
  radius?: number;
};

type Corner = { start: Point; end: Point; arc: number; sweep: 0 | 1 } | undefined;

/** The rounding of the corner at `vertex` between `from` and `to`, or none when it is straight or too sharp to round. */
const corner = (from: Point, vertex: Point, to: Point, radius: number): Corner => {
  const ux = from.x - vertex.x;
  const uy = from.y - vertex.y;
  const wx = to.x - vertex.x;
  const wy = to.y - vertex.y;
  const lu = Math.hypot(ux, uy);
  const lw = Math.hypot(wx, wy);
  const angle = Math.acos(Math.max(-1, Math.min(1, (ux * wx + uy * wy) / (lu * lw))));
  // A straight run has no corner, and a reversal none that an arc can turn.
  if (angle < 1e-3 || Math.PI - angle < 1e-3) {
    return undefined;
  }
  const half = angle / 2;
  // A corner of interior angle θ, rounded by radius r, starts r / tan(θ/2) back along each edge.
  const back = Math.min(radius / Math.tan(half), lu / 2, lw / 2);
  const cross = -ux * wy + uy * wx;
  return {
    start: { x: vertex.x + (ux * back) / lu, y: vertex.y + (uy * back) / lu },
    end: { x: vertex.x + (wx * back) / lw, y: vertex.y + (wy * back) / lw },
    arc: back * Math.tan(half),
    // Screen y runs down, so a positive turn is clockwise: SVG's sweep 1.
    sweep: cross > 0 ? 1 : 0,
  };
};

/**
 * SVG path data for a polyline through unit-space `points` in a frame of `size` (its own px, origin top-left): open,
 * a run of segments; closed, an outline. With a `radius`, every corner between two segments is rounded.
 */
export const polylinePath = (
  size: Size,
  points: readonly Point[],
  { closed = false, inset = 0, radius = 0 }: PolylinePathOptions = {},
): string => {
  const width = Math.max(0, size.width - 2 * inset);
  const height = Math.max(0, size.height - 2 * inset);
  const placed = points
    .map(({ x, y }) => ({ x: inset + x * width, y: inset + y * height }))
    // A repeated vertex is a segment of no length, which has no direction to round a corner by.
    .filter((point, index, all) => index === 0 || point.x !== all[index - 1].x || point.y !== all[index - 1].y);
  if (closed && placed.length > 1) {
    const [first] = placed;
    const last = placed[placed.length - 1];
    if (first.x === last.x && first.y === last.y) {
      placed.pop();
    }
  }
  if (placed.length === 0) {
    return '';
  }
  const at = ({ x, y }: Point) => `${round(x)} ${round(y)}`;
  const count = placed.length;
  const shut = closed && count > 2;
  const corners: Corner[] = placed.map((vertex, index) => {
    const inner = shut || (index > 0 && index < count - 1);
    return radius > 0 && inner
      ? corner(placed[(index + count - 1) % count], vertex, placed[(index + 1) % count], radius)
      : undefined;
  });
  const visit = (index: number) => {
    const rounded = corners[index];
    return rounded
      ? `L ${at(rounded.start)} A ${round(rounded.arc)} ${round(rounded.arc)} 0 0 ${rounded.sweep} ${at(rounded.end)}`
      : `L ${at(placed[index])}`;
  };
  if (!shut) {
    return [`M ${at(placed[0])}`, ...placed.slice(1).map((_, index) => visit(index + 1))].join(' ');
  }
  // Closed, the path starts where the first corner's rounding ends, and ends by turning that corner.
  const head = corners[0]?.end ?? placed[0];
  const rest = placed.slice(1).map((_, index) => visit(index + 1));
  const tail = corners[0] ? [visit(0)] : [];
  return [`M ${at(head)}`, ...rest, ...tail, 'Z'].join(' ');
};
