//
// Copyright 2026 DXOS.org
//

//
// Channel routing for the semantic diagram. Boxes sit on a lattice with gutters between them, so a
// good connector is one of a few shapes — straight, L, Z or U through a gutter, or a three-bend
// detour — between some pair of sides. Every allowed side pair and every nearby channel yields a
// candidate; candidates that clip a box are dropped and the rest are scored by bends, length,
// crossings and shared runs against the connectors already drawn, with rip-up rounds so an early
// edge is not stuck with a choice a later one made worse. Ports are then spread along each side in
// the order their routes leave it (`ports.ts`), parallel runs are separated (`nudge.ts`), and each
// label goes beside its own longest run. A connector no shape can draw falls back to the A* router.
//

import * as Layout from './layout.ts';
import * as Nudge from './nudge.ts';
import { makeAvoidingRouter } from './ortho-router.ts';
import * as Ports from './ports.ts';
import type * as Scene from './scene.ts';
import { type Side, SIDES } from './semantic.ts';
import { GRID, type Rect, zRouter } from './uml-grid.ts';

type Point = Scene.Point;

const FINE = GRID / 2;
/** Clear space a route keeps from a box it does not attach to. */
const CLEAR = GRID / 4;
/** Two parallel runs closer than this read as one line. */
const TOO_CLOSE = GRID / 4;
const LABEL_FONT = Layout.FONT_METRICS.s;

/** Scoring weights; one bend is 10. */
const COST = {
  bend: 10,
  length: 0.3 / GRID,
  crossing: 30,
  overlap: 20,
  sharedSide: 3,
  opposedSide: 6,
  label: 5,
  /** A side the author only preferred; more than a bend, so it gives way to a crossing but not to a detour. */
  unpreferred: 15,
};

/** One end of a connector: a box (zero-sized for a bus junction), the sides it may use, and a fixed port. */
export type End = {
  rect: Rect;
  /** Key of the box, for port bookkeeping; undefined for a junction. */
  node?: string;
  sides: readonly Side[];
  /** Sides the author prefers among `sides`; any other costs extra. */
  preferred?: readonly Side[];
  /** Fixed coordinate along the side. */
  port?: number;
};

/** A waypoint in scene units: one coordinate pins that axis of the route, both pin a point. */
export type Waypoint = { x?: number; y?: number };

export type Piece = {
  /** Connector id; pieces of one bus share a `bus` key and may touch. */
  id: string;
  bus?: string;
  start: End;
  end: End;
  via: readonly Waypoint[];
  points: Point[];
  startSide?: Side;
  endSide?: Side;
  /** Drawn by the A* fallback, which ignores sides and waypoints. */
  forced?: boolean;
  /** Rank of the connector's relation; the highest on a shared side takes its centre. */
  significance?: number;
};

export type Context = {
  /** Every box a route must not cross. */
  obstacles: readonly Rect[];
  /** Text a route should avoid (frame titles). */
  avoid: readonly Rect[];
  /** Channel coordinates: x of vertical gutters, y of horizontal ones. */
  channels: { xs: readonly number[]; ys: readonly number[] };
};

const horizontalSide = (side: Side) => side === 'left' || side === 'right';

const OUT: Record<Side, Point> = {
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const IN: Record<Side, Point> = {
  top: { x: 0, y: 1 },
  bottom: { x: 0, y: -1 },
  left: { x: 1, y: 0 },
  right: { x: -1, y: 0 },
};

const isPoint = (rect: Rect) => rect.w === 0 && rect.h === 0;

const centreOf = (rect: Rect, side: Side) => (horizontalSide(side) ? rect.y + rect.h / 2 : rect.x + rect.w / 2);

const rangeOf = (rect: Rect, side: Side): [number, number] =>
  isPoint(rect)
    ? [centreOf(rect, side), centreOf(rect, side)]
    : horizontalSide(side)
      ? [rect.y + FINE, rect.y + rect.h - FINE]
      : [rect.x + FINE, rect.x + rect.w - FINE];

export const portPoint = (rect: Rect, side: Side, coord: number): Point => {
  if (isPoint(rect)) {
    return { x: rect.x, y: rect.y };
  }
  switch (side) {
    case 'top':
      return { x: coord, y: rect.y };
    case 'bottom':
      return { x: coord, y: rect.y + rect.h };
    case 'left':
      return { x: rect.x, y: coord };
    case 'right':
      return { x: rect.x + rect.w, y: coord };
  }
};

const snap = (value: number, step = CLEAR) => Math.round(value / step) * step;

const same = (left: Point, right: Point) => Math.abs(left.x - right.x) < 0.5 && Math.abs(left.y - right.y) < 0.5;

/** Drops repeated points and collinear midpoints; undefined when the path doubles back on itself. */
export const simplify = (points: readonly Point[]): Point[] | undefined => {
  const distinct = points.filter((point, index) => index === 0 || !same(point, points[index - 1]));
  const result: Point[] = [];
  for (const point of distinct) {
    if (result.length >= 2) {
      const [previous, last] = [result[result.length - 2], result[result.length - 1]];
      const vertical = Math.abs(previous.x - last.x) < 0.5 && Math.abs(last.x - point.x) < 0.5;
      const horizontal = Math.abs(previous.y - last.y) < 0.5 && Math.abs(last.y - point.y) < 0.5;
      if (vertical || horizontal) {
        const reverses = vertical
          ? Math.sign(last.y - previous.y) !== Math.sign(point.y - last.y)
          : Math.sign(last.x - previous.x) !== Math.sign(point.x - last.x);
        if (reverses) {
          return undefined;
        }
        result[result.length - 1] = point;
        continue;
      }
    }
    result.push(point);
  }
  return result;
};

export const bendsOf = (points: readonly Point[]) => Math.max(0, points.length - 2);

const lengthOf = (points: readonly Point[]) =>
  points
    .slice(1)
    .reduce((sum, point, index) => sum + Math.abs(point.x - points[index].x) + Math.abs(point.y - points[index].y), 0);

const direction = (from: Point, to: Point): Point => ({ x: Math.sign(to.x - from.x), y: Math.sign(to.y - from.y) });

/** Whether an axis-aligned segment passes through the rect's interior. */
const hits = (from: Point, to: Point, rect: Rect, inflate: number): boolean => {
  const x0 = Math.min(from.x, to.x);
  const x1 = Math.max(from.x, to.x);
  const y0 = Math.min(from.y, to.y);
  const y1 = Math.max(from.y, to.y);
  return (
    x1 > rect.x - inflate + 0.5 &&
    x0 < rect.x + rect.w + inflate - 0.5 &&
    y1 > rect.y - inflate + 0.5 &&
    y0 < rect.y + rect.h + inflate - 0.5
  );
};

/** Whether a path is drawable: leaves and enters on its sides, never doubles back, and clips no box. */
const valid = (
  points: readonly Point[],
  piece: { start: End; end: End },
  startSide: Side,
  endSide: Side,
  context: Context,
) => {
  if (points.length < 2) {
    return false;
  }
  const first = direction(points[0], points[1]);
  const last = direction(points[points.length - 2], points[points.length - 1]);
  if (!isPoint(piece.start.rect) && (first.x !== OUT[startSide].x || first.y !== OUT[startSide].y)) {
    return false;
  }
  if (!isPoint(piece.end.rect) && (last.x !== IN[endSide].x || last.y !== IN[endSide].y)) {
    return false;
  }
  // A stub shorter than the clearance hugs the box it leaves.
  if (!isPoint(piece.start.rect) && points.length > 2 && lengthOf(points.slice(0, 2)) < CLEAR) {
    return false;
  }
  if (!isPoint(piece.end.rect) && points.length > 2 && lengthOf(points.slice(-2)) < CLEAR) {
    return false;
  }
  for (let index = 0; index < points.length - 1; index++) {
    const [from, to] = [points[index], points[index + 1]];
    for (const rect of context.obstacles) {
      const own = rect === piece.start.rect || rect === piece.end.rect;
      if ((rect === piece.start.rect && index === 0) || (rect === piece.end.rect && index === points.length - 2)) {
        continue;
      }
      if (hits(from, to, rect, own ? 0 : CLEAR)) {
        return false;
      }
    }
  }
  return true;
};

/** Axis moves through the waypoints, sliding a port to meet a waypoint when the side allows it. */
const throughWaypoints = (
  piece: { start: End; end: End; via: readonly Waypoint[] },
  startSide: Side,
  endSide: Side,
): Point[] | undefined => {
  const { start, end } = piece;
  const [startLow, startHigh] = start.port !== undefined ? [start.port, start.port] : rangeOf(start.rect, startSide);
  const startAxis: 'x' | 'y' = horizontalSide(startSide) ? 'y' : 'x';
  let origin = portPoint(start.rect, startSide, start.port ?? centreOf(start.rect, startSide));
  const points: Point[] = [origin];
  const at = () => points[points.length - 1];
  const slide = (value: number) => {
    if (points.length === 1 && value >= startLow && value <= startHigh) {
      origin = portPoint(start.rect, startSide, value);
      points[0] = origin;
      return true;
    }
    return false;
  };
  let viaLast = false;
  for (const waypoint of piece.via) {
    viaLast = true;
    const { x, y } = waypoint;
    if (x !== undefined && y !== undefined) {
      if (!slide(startAxis === 'x' ? x : y)) {
        points.push(horizontalSide(startSide) || points.length > 1 ? { x, y: at().y } : { x: at().x, y });
      }
      points.push({ x: x ?? at().x, y: y ?? at().y });
      points.push({ x, y });
    } else if (x !== undefined) {
      if (startAxis === 'x' && slide(x)) {
        continue;
      }
      points.push({ x, y: at().y });
    } else if (y !== undefined) {
      if (startAxis === 'y' && slide(y)) {
        continue;
      }
      points.push({ x: at().x, y });
    }
  }
  const [endLow, endHigh] = end.port !== undefined ? [end.port, end.port] : rangeOf(end.rect, endSide);
  const last = at();
  const endAxis: 'x' | 'y' = horizontalSide(endSide) ? 'y' : 'x';
  const coord =
    last[endAxis] >= endLow && last[endAxis] <= endHigh ? last[endAxis] : (end.port ?? centreOf(end.rect, endSide));
  const target = portPoint(end.rect, endSide, coord);
  if (target[endAxis] !== last[endAxis]) {
    // The last run either already slides along the side's axis, so one turn lines it up, or it
    // runs toward the side, so it steps aside just outside the box first.
    const previous = points.length > 1 ? points[points.length - 2] : undefined;
    const runsAlong = previous ? Math.abs(previous[endAxis] - last[endAxis]) > 0.5 : startAxis !== endAxis;
    // Continuing a waypoint's run would pass its coordinate by, so the route turns there instead.
    if (runsAlong && !(viaLast && previous)) {
      points.push(endAxis === 'x' ? { x: target.x, y: last.y } : { x: last.x, y: target.y });
    } else {
      const outside = endAxis === 'x' ? target.y + OUT[endSide].y * GRID * 2 : target.x + OUT[endSide].x * GRID * 2;
      points.push(endAxis === 'x' ? { x: last.x, y: outside } : { x: outside, y: last.y });
      points.push(endAxis === 'x' ? { x: target.x, y: outside } : { x: outside, y: target.y });
    }
  }
  points.push(target);
  return simplify(points);
};

/** Every template route between the two ends on one side pair. */
const templates = (piece: { start: End; end: End }, startSide: Side, endSide: Side, context: Context): Point[][] => {
  const { start, end } = piece;
  const startCoord = start.port ?? centreOf(start.rect, startSide);
  const endCoord = end.port ?? centreOf(end.rect, endSide);
  const from = portPoint(start.rect, startSide, startCoord);
  const to = portPoint(end.rect, endSide, endCoord);
  const alongX = horizontalSide(startSide);
  const near = (values: readonly number[], low: number, high: number) =>
    values.filter((value) => value >= low - GRID * 8 && value <= high + GRID * 8);
  const xs = near(context.channels.xs, Math.min(from.x, to.x), Math.max(from.x, to.x));
  const ys = near(context.channels.ys, Math.min(from.y, to.y), Math.max(from.y, to.y));
  const paths: Point[][] = [];
  if (alongX === horizontalSide(endSide)) {
    // Straight, with both ports sliding to a shared coordinate inside both sides.
    const [startLow, startHigh] = start.port !== undefined ? [start.port, start.port] : rangeOf(start.rect, startSide);
    const [endLow, endHigh] = end.port !== undefined ? [end.port, end.port] : rangeOf(end.rect, endSide);
    const low = Math.max(startLow, endLow);
    const high = Math.min(startHigh, endHigh);
    if (low <= high) {
      const coord = Math.min(high, Math.max(low, snap((startCoord + endCoord) / 2)));
      paths.push([portPoint(start.rect, startSide, coord), portPoint(end.rect, endSide, coord)]);
    }
    // Z or U through one channel across the travel axis.
    for (const channel of alongX ? xs : ys) {
      paths.push(
        alongX
          ? [from, { x: channel, y: from.y }, { x: channel, y: to.y }, to]
          : [from, { x: from.x, y: channel }, { x: to.x, y: channel }, to],
      );
    }
  } else {
    paths.push([from, alongX ? { x: to.x, y: from.y } : { x: from.x, y: to.y }, to]);
    for (const first of alongX ? xs : ys) {
      for (const second of alongX ? ys : xs) {
        paths.push(
          alongX
            ? [from, { x: first, y: from.y }, { x: first, y: second }, { x: to.x, y: second }, to]
            : [from, { x: from.x, y: first }, { x: second, y: first }, { x: second, y: to.y }, to],
        );
      }
    }
  }
  return paths.flatMap((path) => {
    const simple = simplify(path);
    return simple ? [simple] : [];
  });
};

/** A run of a route; `docked` marks an end that sits on a box port, where routes meet by design. */
type Segment = {
  owner: string;
  bus?: string;
  pair?: string;
  from: Point;
  to: Point;
  docked: [boolean, boolean];
  /** The piece's ports on boxes. */
  ports: readonly Point[];
};

/** The two boxes a piece joins, in either order; pieces between one pair share their sides by design. */
const pairOf = (piece: { start: End; end: End }): string | undefined =>
  piece.start.node !== undefined && piece.end.node !== undefined
    ? [piece.start.node, piece.end.node].sort().join('|')
    : undefined;

const segmentsOf = (piece: {
  id: string;
  bus?: string;
  start?: End;
  end?: End;
  points: readonly Point[];
}): Segment[] => {
  const pair = piece.start && piece.end ? pairOf({ start: piece.start, end: piece.end }) : undefined;
  const last = piece.points.length - 2;
  const startDocked = piece.start !== undefined && !isPoint(piece.start.rect);
  const endDocked = piece.end !== undefined && !isPoint(piece.end.rect);
  const ports = [
    ...(startDocked ? [piece.points[0]] : []),
    ...(endDocked ? [piece.points[piece.points.length - 1]] : []),
  ];
  return piece.points.slice(0, -1).map((from, index): Segment => ({
    owner: piece.id,
    bus: piece.bus,
    pair,
    from,
    to: piece.points[index + 1],
    docked: [index === 0 && startDocked, index === last && endDocked],
    ports,
  }));
};

const crosses = (left: Segment, right: Segment): boolean => {
  const leftVertical = Math.abs(left.from.x - left.to.x) < 0.5;
  const rightVertical = Math.abs(right.from.x - right.to.x) < 0.5;
  if (leftVertical === rightVertical) {
    return false;
  }
  const [vertical, horizontal] = leftVertical ? [left, right] : [right, left];
  const x = vertical.from.x;
  const y = horizontal.from.y;
  const strictly = (value: number, a: number, b: number) =>
    value > Math.min(a, b) + 0.5 && value < Math.max(a, b) - 0.5;
  return strictly(x, horizontal.from.x, horizontal.to.x) && strictly(y, vertical.from.y, vertical.to.y);
};

const overlaps = (left: Segment, right: Segment): boolean => {
  const leftVertical = Math.abs(left.from.x - left.to.x) < 0.5;
  const rightVertical = Math.abs(right.from.x - right.to.x) < 0.5;
  if (leftVertical !== rightVertical) {
    return false;
  }
  const [leftCoord, rightCoord] = leftVertical ? [left.from.x, right.from.x] : [left.from.y, right.from.y];
  if (Math.abs(leftCoord - rightCoord) >= TOO_CLOSE) {
    return false;
  }
  const span = (segment: Segment) =>
    leftVertical
      ? [Math.min(segment.from.y, segment.to.y), Math.max(segment.from.y, segment.to.y)]
      : [Math.min(segment.from.x, segment.to.x), Math.max(segment.from.x, segment.to.x)];
  const [a0, a1] = span(left);
  const [b0, b1] = span(right);
  return Math.min(a1, b1) - Math.max(a0, b0) > 0.5;
};

/** Whether one segment's end lies on the other, or the two continue each other along one line. */
const touches = (left: Segment, right: Segment): boolean => {
  const on = (point: Point, segment: Segment) =>
    point.x >= Math.min(segment.from.x, segment.to.x) - 0.5 &&
    point.x <= Math.max(segment.from.x, segment.to.x) + 0.5 &&
    point.y >= Math.min(segment.from.y, segment.to.y) - 0.5 &&
    point.y <= Math.max(segment.from.y, segment.to.y) + 0.5;
  // Two routes leaving one port share it only until the ports are spread along the side.
  if (left.ports.some((point) => right.ports.some((other) => same(point, other)))) {
    return false;
  }
  const loose = (segment: Segment) => [segment.from, segment.to].filter((_, end) => !segment.docked[end]);
  if (loose(left).some((point) => on(point, right)) || loose(right).some((point) => on(point, left))) {
    return true;
  }
  const leftVertical = Math.abs(left.from.x - left.to.x) < 0.5;
  const rightVertical = Math.abs(right.from.x - right.to.x) < 0.5;
  if (leftVertical !== rightVertical) {
    return false;
  }
  const [leftCoord, rightCoord] = leftVertical ? [left.from.x, right.from.x] : [left.from.y, right.from.y];
  if (Math.abs(leftCoord - rightCoord) >= 0.5) {
    return false;
  }
  const span = (segment: Segment) =>
    leftVertical
      ? [Math.min(segment.from.y, segment.to.y), Math.max(segment.from.y, segment.to.y)]
      : [Math.min(segment.from.x, segment.to.x), Math.max(segment.from.x, segment.to.x)];
  const [a0, a1] = span(left);
  const [b0, b1] = span(right);
  if (Math.max(a0, b0) - Math.min(a1, b1) >= CLEAR * 2) {
    return false;
  }
  // End to end: the facing ends must not both sit on ports, as two edges into one side do.
  const [first, second] = a1 <= b0 ? [left, right] : [right, left];
  const along = (point: Point) => (leftVertical ? point.y : point.x);
  const firstEnd = along(first.from) > along(first.to) ? 0 : 1;
  const secondEnd = along(second.from) < along(second.to) ? 0 : 1;
  return !(first.docked[firstEnd] && second.docked[secondEnd]);
};

/** Whether two runs leave one port together, which spreading the ports along the side pulls apart. */
const fanned = (left: Segment, right: Segment): boolean =>
  [left.from, left.to].some(
    (point, end) =>
      left.docked[end] &&
      [right.from, right.to].some((other, otherEnd) => right.docked[otherEnd] && same(point, other)),
  );

/** Ports already taken, per box side, by role: an exit beside an entry reads as a crossing. */
type Terminals = Map<string, { owner: string; role: 'exit' | 'entry' }[]>;

const sideKey = (node: string, side: Side) => `${node}:${side}`;

const terminalsOf = (pieces: readonly Piece[], except?: string): Terminals => {
  const terminals: Terminals = new Map();
  for (const piece of pieces) {
    if (piece.id === except || piece.points.length < 2) {
      continue;
    }
    for (const [end, side, role] of [
      [piece.start, piece.startSide, 'exit'],
      [piece.end, piece.endSide, 'entry'],
    ] as const) {
      if (end.node !== undefined && side) {
        const key = sideKey(end.node, side);
        terminals.set(key, [...(terminals.get(key) ?? []), { owner: piece.id, role }]);
      }
    }
  }
  return terminals;
};

/** Cost of drawing `points` for `piece` among the other pieces' segments. */
const costOf = (
  points: readonly Point[],
  piece: { id: string; bus?: string; start: End; end: End },
  startSide: Side,
  endSide: Side,
  others: readonly Segment[],
  terminals: Terminals,
  context: Context,
): number => {
  const own = segmentsOf({ ...piece, points });
  const pair = pairOf(piece);
  let total = COST.bend * bendsOf(points) + COST.length * lengthOf(points);
  for (const segment of own) {
    for (const other of others) {
      if (other.owner === piece.id || (piece.bus !== undefined && other.bus === piece.bus)) {
        continue;
      }
      if (crosses(segment, other)) {
        total += COST.crossing;
      } else if ((pair === undefined || other.pair !== pair) && touches(segment, other)) {
        // A route that ends on another, or continues it end to end, reads as joining it.
        total += COST.crossing;
      } else if (overlaps(segment, other) && (pair === undefined || other.pair !== pair) && !fanned(segment, other)) {
        total += COST.overlap;
      }
    }
    for (const rect of context.avoid) {
      if (hits(segment.from, segment.to, rect, 0)) {
        total += COST.label;
      }
    }
  }
  for (const [end, side, role] of [
    [piece.start, startSide, 'exit'],
    [piece.end, endSide, 'entry'],
  ] as const) {
    if (end.preferred && !end.preferred.includes(side)) {
      total += COST.unpreferred;
    }
    if (end.node === undefined) {
      continue;
    }
    for (const terminal of terminals.get(sideKey(end.node, side)) ?? []) {
      if (piece.bus === undefined || terminal.owner.split('#')[0] !== piece.bus) {
        total += terminal.role === role ? COST.sharedSide : COST.opposedSide;
      }
    }
  }
  return total;
};

type Best = { points: Point[]; startSide: Side; endSide: Side; cost: number };

/** The cheapest valid route for a piece over its allowed sides; undefined when no shape fits. */
export const bestRoute = (
  piece: { id: string; bus?: string; start: End; end: End; via: readonly Waypoint[] },
  others: readonly Segment[],
  terminals: Terminals,
  context: Context,
): Best | undefined => {
  let best: Best | undefined;
  for (const startSide of piece.start.sides) {
    for (const endSide of piece.end.sides) {
      const candidates =
        piece.via.length > 0
          ? [throughWaypoints(piece, startSide, endSide)].flatMap((path) => (path ? [path] : []))
          : templates(piece, startSide, endSide, context);
      for (const points of candidates) {
        if (!valid(points, piece, startSide, endSide, context)) {
          continue;
        }
        const cost = costOf(points, piece, startSide, endSide, others, terminals, context);
        if (!best || cost < best.cost) {
          best = { points, startSide, endSide, cost };
        }
      }
    }
  }
  return best;
};

/** The A* router's path when no template fits; it picks its own faces. */
const fallback = (piece: Piece, context: Context): Best => {
  const router = makeAvoidingRouter([...context.obstacles], zRouter, { step: CLEAR });
  const { start, end } = piece;
  const dx = Math.abs(end.rect.x - start.rect.x);
  const dy = Math.abs(end.rect.y - start.rect.y);
  const points = router({
    relation: { from: piece.start.node ?? piece.id, to: piece.end.node ?? piece.id },
    from: start.rect,
    to: end.rect,
    horizontal: dx > dy,
    offset: 0,
  });
  const sideAt = (point: Point, rect: Rect): Side => Ports.sideOf(point, rect) ?? 'top';
  return {
    points,
    startSide: sideAt(points[0], start.rect),
    endSide: sideAt(points[points.length - 1], end.rect),
    cost: Infinity,
  };
};

/** A bus to route: a hub, its spokes, and the pieces that will be drawn once a junction is chosen. */
export type BusRequest = {
  id: string;
  hub: End;
  spokes: { id: string; end: End }[];
  direction: 'in' | 'out';
  significance?: number;
};

type Item = { kind: 'piece'; piece: Piece } | { kind: 'bus'; bus: BusRequest; pieces: Piece[] };

const piecesOf = (items: readonly Item[]): Piece[] =>
  items.flatMap((item) => (item.kind === 'piece' ? [item.piece] : item.pieces));

/** Junctions worth trying for a bus: channel crossings and channel-to-spoke alignments near the spokes. */
const junctions = (bus: BusRequest, context: Context): Point[] => {
  const rects = [bus.hub.rect, ...bus.spokes.map((spoke) => spoke.end.rect)];
  const x0 = Math.min(...rects.map((rect) => rect.x)) - GRID * 8;
  const x1 = Math.max(...rects.map((rect) => rect.x + rect.w)) + GRID * 8;
  const y0 = Math.min(...rects.map((rect) => rect.y)) - GRID * 8;
  const y1 = Math.max(...rects.map((rect) => rect.y + rect.h)) + GRID * 8;
  const xs = [
    ...context.channels.xs.filter((x) => x > x0 && x < x1),
    ...bus.spokes.map((spoke) => spoke.end.rect.x + spoke.end.rect.w / 2),
  ];
  const ys = [
    ...context.channels.ys.filter((y) => y > y0 && y < y1),
    ...bus.spokes.map((spoke) => spoke.end.rect.y + spoke.end.rect.h / 2),
  ];
  const points = xs.flatMap((x) => ys.map((y) => ({ x, y })));
  // Inside a box is never a junction.
  return points.filter((point) => !context.obstacles.some((rect) => hits(point, point, rect, CLEAR)));
};

/** Routes a bus through its best junction; undefined when no junction serves every spoke. */
const routeBus = (
  bus: BusRequest,
  others: readonly Segment[],
  terminals: Terminals,
  context: Context,
): { pieces: Piece[]; cost: number } | undefined => {
  let best: { pieces: Piece[]; cost: number } | undefined;
  for (const junction of junctions(bus, context)) {
    const point: End = { rect: { x: junction.x, y: junction.y, w: 0, h: 0 }, sides: SIDES };
    const shared = {
      bus: bus.id,
      via: [],
      ...(bus.significance === undefined ? {} : { significance: bus.significance }),
    };
    const trunkPiece =
      bus.direction === 'out'
        ? { id: `${bus.id}#trunk`, ...shared, start: bus.hub, end: point }
        : { id: `${bus.id}#trunk`, ...shared, start: point, end: bus.hub };
    const trunk = bestRoute(trunkPiece, others, terminals, context);
    if (!trunk || (best && trunk.cost >= best.cost)) {
      continue;
    }
    const pieces: Piece[] = [
      { ...trunkPiece, points: trunk.points, startSide: trunk.startSide, endSide: trunk.endSide },
    ];
    let cost = trunk.cost;
    for (const spoke of bus.spokes) {
      const spokePiece =
        bus.direction === 'out'
          ? { id: `${bus.id}#${spoke.id}`, ...shared, start: point, end: spoke.end }
          : { id: `${bus.id}#${spoke.id}`, ...shared, start: spoke.end, end: point };
      // The trunk may continue into a spoke but must not run back over it.
      const trunkSegments = segmentsOf({ id: `${bus.id}#trunk`, bus: bus.id, points: trunk.points });
      const route = bestRoute(spokePiece, [...others, ...trunkSegments], terminals, context);
      if (!route) {
        cost = Infinity;
        break;
      }
      const backtracks = segmentsOf({ id: spokePiece.id, points: route.points }).some((segment) =>
        trunkSegments.some((other) => overlaps(segment, other)),
      );
      cost += route.cost + (backtracks ? COST.overlap * 4 : 0);
      pieces.push({ ...spokePiece, points: route.points, startSide: route.startSide, endSide: route.endSide });
      if (best && cost >= best.cost) {
        break;
      }
    }
    // Gathering spokes that meet head-on along one line, with no arrowhead at either, read as an edge between their boxes.
    const leads = pieces.slice(1).map((piece) => {
      const points = bus.direction === 'out' ? [...piece.points].reverse() : piece.points;
      return points.length >= 2 ? { from: points[0], to: points[1] } : undefined;
    });
    leads.forEach((lead, index) =>
      leads.slice(index + 1).forEach((other) => {
        if (!lead || !other || bus.direction === 'out') {
          return;
        }
        const horizontal = Math.abs(lead.from.y - lead.to.y) < 0.5 && Math.abs(other.from.y - other.to.y) < 0.5;
        const vertical = Math.abs(lead.from.x - lead.to.x) < 0.5 && Math.abs(other.from.x - other.to.x) < 0.5;
        const opposed = horizontal
          ? Math.abs(lead.from.y - other.from.y) < 0.5 &&
            Math.sign(lead.to.x - lead.from.x) === -Math.sign(other.to.x - other.from.x)
          : vertical &&
            Math.abs(lead.from.x - other.from.x) < 0.5 &&
            Math.sign(lead.to.y - lead.from.y) === -Math.sign(other.to.y - other.from.y);
        if (opposed) {
          cost += COST.crossing;
        }
      }),
    );
    if (cost < (best?.cost ?? Infinity)) {
      best = { pieces, cost };
    }
  }
  return best;
};

/** How many times every connector is ripped up and re-routed against all the others. */
const ROUNDS = 3;

/**
 * Routes every piece and bus. Pieces with fewer possible bends go first, so straight neighbours
 * claim their direct runs before a long edge looks for a channel.
 */
export const routeAll = (pieces: readonly Piece[], buses: readonly BusRequest[], context: Context): Piece[] => {
  const items: Item[] = [
    ...pieces.map((piece): Item => ({ kind: 'piece', piece: { ...piece, points: [] } })),
    ...buses.map((bus): Item => ({ kind: 'bus', bus, pieces: [] })),
  ];
  const distance = (item: Item) =>
    item.kind === 'piece'
      ? Math.abs(item.piece.start.rect.x - item.piece.end.rect.x) +
        Math.abs(item.piece.start.rect.y - item.piece.end.rect.y)
      : Infinity;
  const order = [...items].sort((left, right) => distance(left) - distance(right));

  const others = (except: Item) =>
    piecesOf(items.filter((item) => item !== except)).flatMap((piece) => segmentsOf(piece));
  const costNow = (item: Item): number => {
    const segments = others(item);
    if (item.kind === 'piece') {
      const { piece } = item;
      return piece.points.length < 2 || !piece.startSide || !piece.endSide
        ? Infinity
        : costOf(
            piece.points,
            piece,
            piece.startSide,
            piece.endSide,
            segments,
            terminalsOf(piecesOf(items), piece.id),
            context,
          );
    }
    return item.pieces.length === 0
      ? Infinity
      : (routeBus(item.bus, segments, terminalsOf(piecesOf(items.filter((other) => other !== item))), context)?.cost ??
          Infinity);
  };

  for (let round = 0; round < ROUNDS; round++) {
    let changed = false;
    for (const item of order) {
      const segments = others(item);
      if (item.kind === 'piece') {
        const terminals = terminalsOf(piecesOf(items), item.piece.id);
        const route = bestRoute(item.piece, segments, terminals, context);
        const current = round === 0 ? Infinity : costNow(item);
        if (route && route.cost < current - 1e-6) {
          item.piece = { ...item.piece, points: route.points, startSide: route.startSide, endSide: route.endSide };
          changed = true;
        } else if (!route && item.piece.points.length < 2) {
          const forced = fallback(item.piece, context);
          item.piece = {
            ...item.piece,
            points: forced.points,
            startSide: forced.startSide,
            endSide: forced.endSide,
            forced: true,
          };
        }
      } else {
        const terminals = terminalsOf(piecesOf(items.filter((other) => other !== item)));
        const routed = routeBus(item.bus, segments, terminals, context);
        const current = round === 0 ? Infinity : costNow(item);
        if (routed && routed.cost < current - 1e-6) {
          item.pieces = routed.pieces;
          changed = true;
        }
      }
    }
    if (!changed) {
      break;
    }
  }
  // A bus no junction serves is drawn as its separate edges, under the edges' own ids.
  for (const item of items) {
    if (item.kind !== 'bus' || item.pieces.length > 0) {
      continue;
    }
    const { bus } = item;
    item.pieces = bus.spokes.map((spoke) => {
      const [start, end] = bus.direction === 'out' ? [bus.hub, spoke.end] : [spoke.end, bus.hub];
      const piece: Piece = {
        id: spoke.id,
        start,
        end,
        via: [],
        points: [],
        ...(bus.significance === undefined ? {} : { significance: bus.significance }),
      };
      const segments = others(item);
      const route = bestRoute(piece, segments, terminalsOf(piecesOf(items)), context);
      const drawn = route ?? fallback(piece, context);
      return {
        ...piece,
        points: drawn.points,
        startSide: drawn.startSide,
        endSide: drawn.endSide,
        ...(route ? {} : { forced: true }),
      };
    });
  }
  return piecesOf(items);
};

//
// Ports.
//

/**
 * Spreads the ports on every side that several pieces share, in the order their routes leave it,
 * keeping straight pieces straight; returns the pieces with fixed sides and ports to re-route.
 */
export const spreadPorts = (pieces: readonly Piece[]): Piece[] => {
  type Terminal = {
    piece: number;
    end: 'start' | 'end';
    key: number;
    coord: number;
    far: number;
    significance: number;
  };
  const sides = new Map<string, { rect: Rect; side: Side; terminals: Terminal[] }>();
  pieces.forEach((piece, position) => {
    for (const [end, which, side, outward] of [
      [piece.start, 'start', piece.startSide, piece.points],
      [piece.end, 'end', piece.endSide, [...piece.points].reverse()],
    ] as const) {
      if (end.node === undefined || !side || outward.length < 2) {
        continue;
      }
      const axis = horizontalSide(side) ? 'y' : 'x';
      const key = sideKey(end.node, side);
      const entry = sides.get(key) ?? { rect: end.rect, side, terminals: [] };
      entry.terminals.push({
        piece: position,
        end: which,
        key: Ports.keyOf(outward, side),
        coord: outward[0][axis],
        far: outward[outward.length - 1][axis],
        significance: piece.significance ?? 0,
      });
      sides.set(key, entry);
    }
  });
  const ports = pieces.map((): { start?: number; end?: number } => ({}));
  for (const { rect, side, terminals } of sides.values()) {
    if (terminals.length < 2) {
      continue;
    }
    // Bus pieces leaving one junction side share it; one slot per bus.
    const sorted = [...terminals].sort(
      (left, right) => left.key - right.key || left.far - right.far || left.piece - right.piece,
    );
    const [low, high] = rangeOf(rect, side);
    const span = high - low;
    // The most significant terminals straddle the centre; the key order stays, so no stubs cross.
    const top = Math.max(...sorted.map((terminal) => terminal.significance));
    const firstTop = sorted.findIndex((terminal) => terminal.significance === top);
    const lastTop = sorted.findLastIndex((terminal) => terminal.significance === top);
    const anchor = (firstTop + lastTop) / 2;
    const reach = Math.max(anchor, sorted.length - 1 - anchor);
    // Wide enough apart for a label between two parallel runs, within the side.
    const spacing = Math.max(FINE, Math.min(GRID * 1.5, snap(span / 2 / reach, FINE / 2)));
    const centre = (low + high) / 2;
    sorted.forEach((terminal, index) => {
      const coord = Math.min(high, Math.max(low, snap(centre + (index - anchor) * spacing)));
      ports[terminal.piece][terminal.end] = coord;
    });
  }
  // A straight piece keeps one shared coordinate for both ends, inside both sides.
  pieces.forEach((piece, position) => {
    if (piece.points.length !== 2 || !piece.startSide || !piece.endSide) {
      return;
    }
    const assigned = ports[position];
    if (assigned.start === undefined && assigned.end === undefined) {
      return;
    }
    const axis = horizontalSide(piece.startSide) ? 'y' : 'x';
    const [startLow, startHigh] = rangeOf(piece.start.rect, piece.startSide);
    const [endLow, endHigh] = rangeOf(piece.end.rect, piece.endSide);
    const low = Math.max(startLow, endLow);
    const high = Math.min(startHigh, endHigh);
    const wanted = [assigned.start, assigned.end, piece.points[0][axis]].flatMap((value) =>
      value === undefined ? [] : [value],
    );
    const coord = wanted.find((value) => value >= low && value <= high) ?? piece.points[0][axis];
    ports[position] = { start: coord, end: coord };
  });
  return pieces.map((piece, position) => ({
    ...piece,
    start: {
      ...piece.start,
      sides: piece.startSide ? [piece.startSide] : piece.start.sides,
      port:
        ports[position].start ??
        (piece.startSide && piece.start.node !== undefined
          ? piece.points[0][horizontalSide(piece.startSide) ? 'y' : 'x']
          : piece.start.port),
    },
    end: {
      ...piece.end,
      sides: piece.endSide ? [piece.endSide] : piece.end.sides,
      port:
        ports[position].end ??
        (piece.endSide && piece.end.node !== undefined
          ? piece.points[piece.points.length - 1][horizontalSide(piece.endSide) ? 'y' : 'x']
          : piece.end.port),
    },
  }));
};

/** Re-routes pieces whose sides and ports are now fixed; a piece no shape can draw keeps its old route. */
export const reroute = (fixed: readonly Piece[], previous: readonly Piece[], context: Context): Piece[] => {
  const result: Piece[] = [];
  fixed.forEach((piece, position) => {
    const others = [...result, ...previous.slice(position + 1)].flatMap((other) => segmentsOf(other));
    const route = bestRoute(piece, others, new Map(), context);
    result.push(
      route
        ? { ...piece, points: route.points, startSide: route.startSide, endSide: route.endSide }
        : previous[position],
    );
  });
  return result;
};

/** Separates parallel runs; bus pieces stay put, since they meet on purpose. */
export const separate = (pieces: readonly Piece[], context: Context): Piece[] => {
  const free = pieces.filter((piece) => piece.bus === undefined);
  const nudged = Nudge.nudge(
    free.map((piece) => ({
      points: piece.points,
      ...(isPoint(piece.start.rect) ? {} : { source: piece.start.rect }),
      ...(isPoint(piece.end.rect) ? {} : { target: piece.end.rect }),
    })),
    {
      spacing: CLEAR,
      obstacles: context.obstacles,
      fixed: pieces.filter((piece) => piece.bus !== undefined).map((piece) => piece.points),
    },
  );
  const byPiece = new Map(free.map((piece, position) => [piece, nudged[position]]));
  return pieces.map((piece) => {
    const points = byPiece.get(piece);
    return points ? { ...piece, points } : piece;
  });
};

//
// Labels.
//

export type LabelRequest = {
  id: string;
  text: string;
  points: readonly Point[];
  /** A trunk the route shares with others, where its label goes only when its own runs have no room. */
  shared?: readonly Point[];
};

export type LabelOptions = {
  /** Every drawn route, the label's own among them. */
  paths: readonly (readonly Point[])[];
  boxes: readonly Rect[];
  /** Text already on the drawing (frame titles). */
  avoid: readonly Rect[];
  /** Group frames, whose dashed borders a label must not sit on. */
  frames?: readonly Rect[];
  bounds: Rect;
};

/** The SVG renderer draws `s` text at about this share of the tldraw metric, so a label is anchored where its text starts. */
const VISIBLE = 0.58;

const rectsOverlap = (left: Rect, right: Rect) =>
  left.x < right.x + right.w && right.x < left.x + left.w && left.y < right.y + right.h && right.y < left.y + left.h;

const inflate = (rect: Rect, by: number): Rect => ({
  x: rect.x - by,
  y: rect.y - by,
  w: rect.w + by * 2,
  h: rect.h + by * 2,
});

const within = (outer: Rect, inner: Rect) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.w <= outer.x + outer.w &&
  inner.y + inner.h <= outer.y + outer.h;

/** Gap between a rect and an axis-aligned segment; zero when they touch. */
const gapTo = (rect: Rect, [from, to]: readonly [Point, Point]) => {
  const dx = Math.max(Math.min(from.x, to.x) - (rect.x + rect.w), rect.x - Math.max(from.x, to.x), 0);
  const dy = Math.max(Math.min(from.y, to.y) - (rect.y + rect.h), rect.y - Math.max(from.y, to.y), 0);
  return Math.hypot(dx, dy);
};

const keyOf = ([from, to]: readonly [Point, Point]) => `${from.x},${from.y},${to.x},${to.y}`;

/** Whether a rect straddles a frame's border, rather than lying wholly inside or outside it. */
export const onBorder = (rect: Rect, frame: Rect, clearance = CLEAR): boolean => {
  const grown = inflate(rect, clearance);
  return rectsOverlap(grown, frame) && !within(frame, grown);
};

/** Clutter outweighs every preference, so a clear spot anywhere on the route beats a cluttered one at its middle. */
const CLUTTER = 10;

/**
 * Each label beside a run of its own route, nearer that route than any other, and clear of boxes,
 * other labels, other routes, frame borders and frame titles: the longest run first, its middle
 * first, above a horizontal run or right of a vertical one (where the text starts at the line).
 * When nothing is clear, the least-cluttered spot wins.
 */
export const placeLabels = (labels: readonly LabelRequest[], options: LabelOptions): Scene.Text[] => {
  const { paths, boxes, avoid, frames = [] } = options;
  const segments = paths.flatMap((points) =>
    points.slice(0, -1).map((from, index): [Point, Point] => [from, points[index + 1]]),
  );
  // Routes may leave the frames to go around them, and a label beside such a run is still inside the drawing.
  const xs = [
    options.bounds.x,
    options.bounds.x + options.bounds.w,
    ...paths.flatMap((points) => points.map((point) => point.x)),
  ];
  const ys = [
    options.bounds.y,
    options.bounds.y + options.bounds.h,
    ...paths.flatMap((points) => points.map((point) => point.y)),
  ];
  const margin = LABEL_FONT.lineH + CLEAR * 2;
  const bounds = {
    x: Math.min(...xs) - margin,
    y: Math.min(...ys) - margin,
    w: Math.max(...xs) - Math.min(...xs) + margin * 2,
    h: Math.max(...ys) - Math.min(...ys) + margin * 2,
  };
  const placed: Rect[] = [...avoid];
  const runsOf = (points: readonly Point[]) =>
    points.slice(0, -1).map((from, index): [Point, Point] => [from, points[index + 1]]);
  return labels.map(({ id, text, points, shared = [] }) => {
    const size = { w: text.length * LABEL_FONT.charW, h: LABEL_FONT.lineH };
    const visible = size.w * VISIBLE;
    const own = [...runsOf(points), ...runsOf(shared)];
    const mine = new Set(own.map(keyOf));
    const foreign = segments.filter((segment) => !mine.has(keyOf(segment)));
    const byLength = (runs: [Point, Point][], penalty: number) =>
      runs
        .map((segment) => ({
          segment,
          penalty,
          length: Math.abs(segment[1].x - segment[0].x) + Math.abs(segment[1].y - segment[0].y),
        }))
        .sort((left, right) => right.length - left.length);
    const runs = [...byLength(runsOf(points), 0), ...byLength(runsOf(shared), 2)];
    type Candidate = { origin: Point; preference: number };
    const candidates = runs.flatMap(({ segment: [from, to], length, penalty }, rank): Candidate[] => {
      const vertical = Math.abs(from.x - to.x) < 0.5;
      // Stops along the run, middle first, kept far enough from its ends that the text stays beside it.
      const reach = Math.max(0, length / 2 - (vertical ? size.h : visible / 2));
      const stops = [
        0,
        ...Array.from({ length: Math.floor(reach / FINE) }, (_, index) => (index + 1) * FINE).flatMap((step) => [
          step,
          -step,
        ]),
      ];
      const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
      return stops.flatMap((offset) => {
        const at = vertical ? { x: mid.x, y: mid.y + offset } : { x: mid.x + offset, y: mid.y };
        const along = Math.abs(offset) / Math.max(length, 1);
        return [0, CLEAR, CLEAR * 2, CLEAR * 4, CLEAR * 6, CLEAR * 8].flatMap((shift) => {
          const base = penalty + rank * 0.6 + along + shift / CLEAR / 4;
          return vertical
            ? [
                { origin: { x: at.x + CLEAR + shift, y: at.y - size.h / 2 }, preference: base },
                { origin: { x: at.x - CLEAR - visible - shift, y: at.y - size.h / 2 }, preference: base + 0.3 },
              ]
            : [visible, size.w].flatMap((centred, measure) => [
                // Centred on the drawn text first, then on its full measure where that is what fits.
                {
                  origin: { x: at.x - centred / 2, y: at.y - size.h - CLEAR / 2 - shift },
                  preference: base + measure * 0.3,
                },
                {
                  origin: { x: at.x - centred / 2, y: at.y + CLEAR / 2 + shift },
                  preference: base + 0.2 + measure * 0.3,
                },
              ]);
        });
      });
    });
    // `extent` is the label as the shared metrics measure it, which overlap diagnostics use; `ink` is the drawn text.
    const clutter = (origin: Point) => {
      const extent = { ...origin, ...size };
      const ink = { ...origin, w: visible, h: size.h };
      const nearest = Math.min(...own.map((segment) => gapTo(ink, segment)));
      return (
        (within(bounds, extent) ? 0 : 4) +
        // Text over a box or another label hides what the reader needs, so it outweighs everything else.
        boxes.filter((box) => rectsOverlap(extent, box)).length * 8 +
        boxes.filter((box) => rectsOverlap(ink, inflate(box, 4))).length +
        placed.filter((other) => rectsOverlap(extent, other)).length * 8 +
        frames.filter((frame) => onBorder(ink, frame, CLEAR / 2)).length * 3 +
        segments.filter(([from, to]) => hits(from, to, ink, 0)).length * 2 +
        // A foreign run hugging the label, or nearer to it than its own, makes it read as that run's.
        foreign.filter((segment) => gapTo(ink, segment) < CLEAR * 2).length +
        foreign.filter((segment) => gapTo(ink, segment) < nearest - 0.5).length * 2
      );
    };
    let best = candidates[0]?.origin ?? { x: points[0].x, y: points[0].y };
    let bestScore = Infinity;
    for (const { origin, preference } of candidates) {
      if (preference >= bestScore) {
        continue;
      }
      const score = clutter(origin) * CLUTTER + preference;
      if (score < bestScore) {
        best = origin;
        bestScore = score;
      }
    }
    placed.push({ ...best, ...size });
    return { kind: 'text', id: `${id}-label`, x: Math.round(best.x), y: Math.round(best.y), text, weight: 's' };
  });
};
