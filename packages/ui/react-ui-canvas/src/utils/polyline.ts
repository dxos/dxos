//
// Copyright 2026 DXOS.org
//

import { type Bounds, type Point, type PolylineBend, type PolylineNode, type Size } from '@dxos/scene';

/** How near a placed vertex a press must be, in screen px, to land on it: on the first, it closes the line. */
export const VERTEX_SNAP_PX = 8;

/** How far the pointer travels, in screen px, between two samples of a stroke drawn freehand. */
export const FREEHAND_STEP_PX = 2;

/** How far off its line, in screen px, a sample of a stroke may lie and still be dropped when the stroke lands. */
export const FREEHAND_TOLERANCE_PX = 1.5;

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

/** Where on a parabola from `from` to `to` about `control` one axis turns back, as a share of the way along it. */
const turning = (from: number, control: number, to: number): number[] => {
  const bend = from - 2 * control + to;
  const share = bend === 0 ? -1 : (from - control) / bend;
  return share > 0 && share < 1 ? [share] : [];
};

/** The point `share` of the way along the parabola from `from` to `to` about `control`. */
export const parabolaPoint = (from: Point, control: Point, to: Point, share: number): Point => {
  const [head, middle, tail] = [(1 - share) ** 2, 2 * share * (1 - share), share ** 2];
  return {
    x: head * from.x + middle * control.x + tail * to.x,
    y: head * from.y + middle * control.y + tail * to.y,
  };
};

/** The point `share` of the way along the cubic from `from` to `to`, leaving toward `control` and arriving from `second`. */
export const cubicPoint = (from: Point, control: Point, second: Point, to: Point, share: number): Point => {
  const rest = 1 - share;
  const [head, out, back, tail] = [rest ** 3, 3 * rest ** 2 * share, 3 * rest * share ** 2, share ** 3];
  return {
    x: head * from.x + out * control.x + back * second.x + tail * to.x,
    y: head * from.y + out * control.y + back * second.y + tail * to.y,
  };
};

/** The point `share` of the way along a bent segment from `from` to `to`. */
export const bendPoint = (from: Point, { control, second }: PolylineBend, to: Point, share: number): Point =>
  second ? cubicPoint(from, control, second, to, share) : parabolaPoint(from, control, to, share);

/** How finely a cubic is walked to find how far out it reaches. */
const CUBIC_STEPS = 24;

/** The points a bent segment reaches furthest out on each axis, which its ends alone do not bound. */
const bendReach = (points: readonly Point[], bend: PolylineBend): Point[] => {
  const from = points[bend.segment];
  const to = points[(bend.segment + 1) % points.length];
  if (!from || !to) {
    return [];
  }
  const { control, second } = bend;
  if (second) {
    return Array.from({ length: CUBIC_STEPS - 1 }, (_, step) =>
      cubicPoint(from, control, second, to, (step + 1) / CUBIC_STEPS),
    );
  }
  return [...turning(from.x, control.x, to.x), ...turning(from.y, control.y, to.y)].map((share) =>
    parabolaPoint(from, control, to, share),
  );
};

/** A bend with each of its controls put through `place`. */
const placeBend = ({ segment, control, second }: PolylineBend, place: (point: Point) => Point): PolylineBend => ({
  segment,
  control: place(control),
  ...(second ? { second: place(second) } : {}),
});

/**
 * The frame of a polyline drawn through scene `points` and those points in its unit space (0..1 of the frame, origin
 * top-left). Each side is at least `minimum`, so a straight line still has a frame to scale. A bent segment bulges
 * past its ends, so the frame covers where each of `bends` reaches; their controls come back in unit space too.
 */
export const polylineFrame = (
  points: readonly Point[],
  minimum = 0,
  bends: readonly PolylineBend[] = [],
): { bounds: Bounds; points: Point[]; bends: PolylineBend[] } | undefined => {
  if (points.length === 0) {
    return undefined;
  }
  const covered = [...points, ...bends.flatMap((bend) => bendReach(points, bend))];
  const [x, width] = span(
    covered.map(({ x }) => x),
    minimum,
  );
  const [y, height] = span(
    covered.map(({ y }) => y),
    minimum,
  );
  const unit = (value: number, origin: number, extent: number) => (extent > 0 ? (value - origin) / extent : 0.5);
  const place = (point: Point): Point => ({ x: unit(point.x, x, width), y: unit(point.y, y, height) });
  return {
    bounds: { x, y, width, height },
    points: points.map(place),
    bends: bends.map((bend) => placeBend(bend, place)),
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
export type VertexShape = Pick<PolylineNode, 'center' | 'size' | 'rotation' | 'points' | 'bends'>;

/** Whether `node` carries unit-space `points` to edit as vertices. */
export const hasVertices = <T extends object>(node: T): node is T & VertexShape => {
  const points: unknown = Reflect.get(node, 'points');
  return Array.isArray(points);
};

/** The fewest vertices a polyline keeps: one segment open, a triangle closed. */
export const minPolylineVertices = (closed: boolean): number => (closed ? 3 : 2);

/** A polyline's vertices in scene coordinates: its unit-space points placed in its frame and turned by its rotation. */
export const polylineVertices = (node: VertexShape): Point[] => node.points.map((point) => inScene(node, point));

/** A unit-space point of a polyline in scene coordinates: placed in its frame and turned by its rotation. */
const inScene = ({ center, size, rotation }: VertexShape, { x, y }: Point): Point =>
  turn(
    { x: center.x - size.width / 2 + x * size.width, y: center.y - size.height / 2 + y * size.height },
    center,
    rotation ?? 0,
  );

/** A polyline's bends with their controls in scene coordinates, as `polylineVertices` gives its vertices. */
export const polylineBends = (node: VertexShape): PolylineBend[] =>
  (node.bends ?? []).map((bend) => placeBend(bend, (point) => inScene(node, point)));

const between = (from: Point, to: Point): Point => ({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 });

/**
 * Where the line from `from` along `along` meets the line from `to` along `into`, with how far along each it is (in
 * lengths of that direction); none where the two run side by side.
 */
const meet = (
  from: Point,
  along: Point,
  to: Point,
  into: Point,
): { point: Point; out: number; back: number } | undefined => {
  const cross = along.x * into.y - along.y * into.x;
  if (Math.abs(cross) < 1e-9) {
    return undefined;
  }
  const [dx, dy] = [to.x - from.x, to.y - from.y];
  const out = (dx * into.y - dy * into.x) / cross;
  const back = (dx * along.y - dy * along.x) / cross;
  return { point: { x: from.x + out * along.x, y: from.y + out * along.y }, out, back };
};

/**
 * `bends` once a vertex is put in at `index` of scene `vertices`, on the curve: a bent segment it splits is two bent
 * ones that draw the same curve (a curve cut at its middle is two of its kind), and the bends after it are one
 * further on.
 */
export const bendsAfterInsert = (
  bends: readonly PolylineBend[],
  index: number,
  vertices: readonly Point[],
): PolylineBend[] =>
  bends.flatMap((bend): PolylineBend[] => {
    if (bend.segment !== index - 1) {
      return [bend.segment >= index ? { ...bend, segment: bend.segment + 1 } : bend];
    }
    const from = vertices[bend.segment];
    const to = vertices[(bend.segment + 1) % vertices.length];
    const { control, second } = bend;
    if (!second) {
      return [
        { segment: bend.segment, control: between(from, control) },
        { segment: bend.segment + 1, control: between(control, to) },
      ];
    }
    // A cubic cut at its middle: each half's controls are midway along the frame of the whole, and midway again.
    const [out, across, back] = [between(from, control), between(control, second), between(second, to)];
    return [
      { segment: bend.segment, control: out, second: between(out, across) },
      { segment: bend.segment + 1, control: between(across, back), second: back },
    ];
  });

/**
 * `bends` once the vertex at `index` of scene `vertices` is taken out: the two segments that met there are one, bent
 * where either was, which leaves its first point as the one did and arrives at its last as the other did; the bends
 * after it are one nearer.
 */
export const bendsAfterDelete = (
  bends: readonly PolylineBend[],
  index: number,
  vertices: readonly Point[],
): PolylineBend[] => {
  const count = vertices.length;
  const before = (index - 1 + count) % count;
  const [arriving, leaving] = [
    bends.find(({ segment }) => segment === before),
    bends.find(({ segment }) => segment === index),
  ];
  const [from, to] = [vertices[before], vertices[(index + 1) % count]];
  // Where the joined segment arrives from: a cubic's second control, or a parabola's one.
  const last = leaving?.second ?? leaving?.control;
  const cubic = arriving?.second !== undefined || leaving?.second !== undefined;
  const lone = (arriving ?? leaving)?.control;
  const joined: Pick<PolylineBend, 'control' | 'second'> | undefined = cubic
    ? { control: arriving?.control ?? from, second: last ?? to }
    : arriving && last
      ? {
          // Two parabolas are one whose control is where the ways out of the two far ends meet.
          control:
            meet(from, { x: arriving.control.x - from.x, y: arriving.control.y - from.y }, to, {
              x: last.x - to.x,
              y: last.y - to.y,
            })?.point ?? between(arriving.control, last),
        }
      : lone
        ? { control: lone }
        : undefined;
  const rest = bends
    .filter(({ segment }) => segment !== index && segment !== before)
    .map((bend) => (bend.segment > index ? { ...bend, segment: bend.segment - 1 } : bend));
  // The joined segment leaves the vertex before the one taken out; the first of a closed line gone, that is the last.
  const segment = index === 0 ? count - 2 : before;
  return joined ? [...rest, { segment, ...joined }].sort((left, right) => left.segment - right.segment) : rest;
};

/**
 * A bend for every segment of a line through scene `points`, so the line runs through them as one curve: each
 * segment is a cubic that leaves its first point along the way from the point before it to the one after, and
 * arrives at its last along that point's way (a Catmull-Rom spline). The end of an open line has one neighbour,
 * which stands in for both.
 */
export const smoothBends = (points: readonly Point[], closed = false): PolylineBend[] => {
  const count = points.length;
  const loop = closed && count > 2;
  const at = (index: number) => points[loop ? (index + count) % count : Math.min(Math.max(index, 0), count - 1)];
  return Array.from({ length: Math.max(0, loop ? count : count - 1) }, (_, segment) => {
    const [before, from, to, after] = [at(segment - 1), at(segment), at(segment + 1), at(segment + 2)];
    return {
      segment,
      control: { x: from.x + (to.x - before.x) / 6, y: from.y + (to.y - before.y) / 6 },
      second: { x: to.x - (after.x - from.x) / 6, y: to.y - (after.y - from.y) / 6 },
    };
  });
};

/**
 * The `update` values that put a polyline's vertices at scene `vertices`: its frame refitted to them in its own axes
 * (each side at least `minimum`) and turned as before, and its points renormalised to that frame. Its bends stay
 * where they are in the scene unless `bends` gives them, as it must where the line has a vertex more or fewer.
 */
export const refitPolyline = (
  node: VertexShape,
  vertices: readonly Point[],
  minimum = 0,
  bends: readonly PolylineBend[] = polylineBends(node),
): Pick<PolylineNode, 'center' | 'size' | 'points' | 'bends'> | undefined => {
  const rotation = node.rotation ?? 0;
  const unturned = (point: Point) => turn(point, node.center, -rotation);
  // Fitted unturned about the old centre, so a rotated line keeps its rotation rather than growing a tilted frame.
  const frame = polylineFrame(
    vertices.map(unturned),
    minimum,
    bends.map((bend) => placeBend(bend, unturned)),
  );
  if (!frame) {
    return undefined;
  }
  const { x, y, width, height } = frame.bounds;
  return {
    center: turn({ x: x + width / 2, y: y + height / 2 }, node.center, rotation),
    size: { width, height },
    points: frame.points,
    // Written only where the line has any, so a line of straight segments stays as it was stored.
    ...(node.bends !== undefined || frame.bends.length > 0 ? { bends: frame.bends } : {}),
  };
};

/**
 * Each segment's midpoint with the index a vertex inserted there takes; a closed line's closing segment too. A
 * segment of `bends` has its midpoint on its curve, where a vertex put in leaves the curve as it was.
 */
export const polylineMidpoints = (
  vertices: readonly Point[],
  closed: boolean,
  bends: readonly PolylineBend[] = [],
): { index: number; point: Point }[] => {
  const segments = closed && vertices.length >= 3 ? vertices.length : vertices.length - 1;
  return Array.from({ length: Math.max(0, segments) }, (_, index) => {
    const from = vertices[index];
    const to = vertices[(index + 1) % vertices.length];
    const bend = bends.find(({ segment }) => segment === index);
    return { index: index + 1, point: bend ? bendPoint(from, bend, to, 0.5) : between(from, to) };
  });
};

/** How far `point` is from the line through `from` and `to`, or from `from` where the two are one point. */
const offLine = (point: Point, from: Point, to: Point): number => {
  const [dx, dy] = [to.x - from.x, to.y - from.y];
  const length = Math.hypot(dx, dy);
  return length === 0
    ? Math.hypot(point.x - from.x, point.y - from.y)
    : Math.abs(dy * (point.x - from.x) - dx * (point.y - from.y)) / length;
};

/**
 * `points` without those that lie within `tolerance` of the line the rest draw (Ramer-Douglas-Peucker): a stroke
 * sampled from the pointer has a point every few px, and a line drawn through a tenth of them reads the same, with
 * few enough vertices to edit. The ends are always kept.
 */
export const simplifyPath = (points: readonly Point[], tolerance: number): Point[] => {
  if (points.length <= 2) {
    return [...points];
  }
  const [first, last] = [points[0], points[points.length - 1]];
  const { index, distance } = points.slice(1, -1).reduce(
    (furthest, point, offset) => {
      const distance = offLine(point, first, last);
      return distance > furthest.distance ? { index: offset + 1, distance } : furthest;
    },
    { index: 0, distance: 0 },
  );
  if (distance <= tolerance) {
    return [first, last];
  }
  return [
    ...simplifyPath(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplifyPath(points.slice(index), tolerance),
  ];
};

export type PolylinePathOptions = {
  /** Joins the last vertex back to the first. */
  closed?: boolean;
  /** The line is one curve through the vertices (a Catmull-Rom spline) rather than straight segments. */
  smooth?: boolean;
  /** Px kept inside the frame, so a stroke twice that wide stays within it. */
  inset?: number;
  /** Px each corner is rounded by, no larger than half of either adjacent edge allows. */
  radius?: number;
  /** The segments that run as parabolas, their controls in unit space; a line with any has no rounded corners. */
  bends?: readonly PolylineBend[];
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
  { closed = false, smooth = false, inset = 0, radius = 0, bends = [] }: PolylinePathOptions = {},
): string => {
  const width = Math.max(0, size.width - 2 * inset);
  const height = Math.max(0, size.height - 2 * inset);
  const place = ({ x, y }: Point): Point => ({ x: inset + x * width, y: inset + y * height });
  if (bends.length > 0 && points.length > 1) {
    // Every vertex is kept, a repeated one too: a bend names its segment by the index of the point it leaves.
    const curves = new Map(bends.map((bend) => [bend.segment, placeBend(bend, place)]));
    const vertices = points.map(place);
    // Two vertices close into a shape where a bend holds the two runs apart: a lens, or a crescent.
    const loop = closed && vertices.length > 1;
    const to = ({ x, y }: Point) => `${round(x)} ${round(y)}`;
    const segments = Array.from({ length: loop ? vertices.length : vertices.length - 1 }, (_, index) => {
      const curve = curves.get(index);
      const end = vertices[(index + 1) % vertices.length];
      return curve?.second
        ? `C ${to(curve.control)}, ${to(curve.second)}, ${to(end)}`
        : curve
          ? `Q ${to(curve.control)}, ${to(end)}`
          : `L ${to(end)}`;
    });
    return [`M ${to(vertices[0])}`, ...segments, ...(loop ? ['Z'] : [])].join(' ');
  }
  const placed = points
    .map(place)
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
  if (smooth && count > 2) {
    // Each span is a cubic whose handles follow the chord of its neighbours, so the curve passes through every
    // vertex and leaves it the way it came in. An open line's ends have one neighbour, which stands in for both.
    const vertex = (index: number) => placed[shut ? (index + count) % count : Math.min(Math.max(index, 0), count - 1)];
    // A handle is held inside the frame, which is only as large as the vertices: a curve lies within its handles, so
    // it then never bulges past the frame, where it would be cut off.
    const within = ({ x, y }: Point): Point => ({
      x: Math.min(Math.max(x, inset), inset + width),
      y: Math.min(Math.max(y, inset), inset + height),
    });
    const span = (index: number) => {
      const [before, from, to, after] = [vertex(index - 1), vertex(index), vertex(index + 1), vertex(index + 2)];
      const first = within({ x: from.x + (to.x - before.x) / 6, y: from.y + (to.y - before.y) / 6 });
      const second = within({ x: to.x - (after.x - from.x) / 6, y: to.y - (after.y - from.y) / 6 });
      return `C ${at(first)}, ${at(second)}, ${at(to)}`;
    };
    const spans = Array.from({ length: shut ? count : count - 1 }, (_, index) => span(index));
    return [`M ${at(placed[0])}`, ...spans, ...(shut ? ['Z'] : [])].join(' ');
  }
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
