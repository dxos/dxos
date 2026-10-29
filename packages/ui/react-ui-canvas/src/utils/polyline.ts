//
// Copyright 2026 DXOS.org
//

import { type Bounds, type Point, type PolylineNode, type Size } from '../model/index.ts';

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

/** `point` turned `degrees` clockwise about `center`. */
const turn = (point: Point, center: Point, degrees: number): Point => {
  if (degrees === 0) {
    return point;
  }
  const angle = (degrees * Math.PI) / 180;
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * Math.cos(angle) - dy * Math.sin(angle),
    y: center.y + dx * Math.sin(angle) + dy * Math.cos(angle),
  };
};

/** What a node edited by its vertices carries (`NodeDef.editor`): a frame and unit-space `points` in it. */
export type VertexShape = Pick<PolylineNode, 'center' | 'size' | 'rotation' | 'points'>;

/** Whether `node` carries unit-space `points` to edit as vertices. */
export const hasVertices = <T extends object>(node: T): node is T & VertexShape => {
  const points: unknown = Reflect.get(node, 'points');
  return Array.isArray(points);
};

/** The fewest vertices a polyline keeps: one segment open, a triangle closed. */
export const minPolylineVertices = (closed: boolean): number => (closed ? 3 : 2);

/** A polyline's vertices in scene coordinates: its unit-space points placed in its frame and turned by its rotation. */
export const polylineVertices = (node: VertexShape): Point[] => {
  const { center, size } = node;
  const left = center.x - size.width / 2;
  const top = center.y - size.height / 2;
  return node.points.map(({ x, y }) =>
    turn({ x: left + x * size.width, y: top + y * size.height }, center, node.rotation ?? 0),
  );
};

/**
 * The `update` values that put a polyline's vertices at scene `vertices`: its frame refitted to them in its own axes
 * (each side at least `minimum`) and turned as before, and its points renormalised to that frame.
 */
export const refitPolyline = (
  node: VertexShape,
  vertices: readonly Point[],
  minimum = 0,
): Pick<PolylineNode, 'center' | 'size' | 'points'> | undefined => {
  const rotation = node.rotation ?? 0;
  // Fitted unturned about the old centre, so a rotated line keeps its rotation rather than growing a tilted frame.
  const frame = polylineFrame(
    vertices.map((vertex) => turn(vertex, node.center, -rotation)),
    minimum,
  );
  if (!frame) {
    return undefined;
  }
  const { x, y, width, height } = frame.bounds;
  return {
    center: turn({ x: x + width / 2, y: y + height / 2 }, node.center, rotation),
    size: { width, height },
    points: frame.points,
  };
};

/** Each segment's midpoint with the index a vertex inserted there takes; a closed line's closing segment too. */
export const polylineMidpoints = (vertices: readonly Point[], closed: boolean): { index: number; point: Point }[] => {
  const segments = closed && vertices.length >= 3 ? vertices.length : vertices.length - 1;
  return Array.from({ length: Math.max(0, segments) }, (_, index) => {
    const from = vertices[index];
    const to = vertices[(index + 1) % vertices.length];
    return { index: index + 1, point: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 } };
  });
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
  // A corner of interior angle theta, rounded by radius r, starts r / tan(theta/2) back along each edge.
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
