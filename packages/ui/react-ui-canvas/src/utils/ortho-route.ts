//
// Copyright 2026 DXOS.org
//

//
// An orthogonal link's route between two ports. Each end leaves its port along the side's normal (its elbow), and the
// route between the two elbows is the one of fewest right-angled bends that stays clear of both shapes: none where
// the ports face each other on one line, one where their sides meet at a corner, two for a step or a U, and up to
// four where a port faces away from the other shape. It reads its own two ends and their frames only, so a shape
// elsewhere never re-routes it.
//

import { type Point, type Side } from '@dxos/scene';

import { type RouteEnd } from './route.ts';

type Rect = { left: number; top: number; right: number; bottom: number };

/** What a route costs, compared in this order: a bend is worse than any length, and evenness only breaks a tie. */
type Cost = { bends: number; length: number; squares: number };

type Step = { col: number; row: number; heading: number; cost: Cost; previous?: Step };

/** Two lengths within this, in scene px, are the same length. */
const EPSILON = 1e-6;

/** The ways a segment runs, in turning order, so a quarter turn either way is the next or the one before. */
const HEADINGS: readonly Point[] = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];

const HEADING: Record<Side, number> = { e: 0, s: 1, w: 2, n: 3 };

const rectOf = ({ point, bounds }: RouteEnd): Rect =>
  bounds
    ? { left: bounds.x, top: bounds.y, right: bounds.x + bounds.width, bottom: bounds.y + bounds.height }
    : { left: point.x, top: point.y, right: point.x, bottom: point.y };

/** Where an end's elbow turns at the soonest: straight out of its port, on the edge of the room kept round its shape. */
const exitOf = ({ point, side }: RouteEnd, zone: Rect): Point => {
  switch (side) {
    case 'e':
      return { x: zone.right, y: point.y };
    case 'w':
      return { x: zone.left, y: point.y };
    case 'n':
      return { x: point.x, y: zone.top };
    case 's':
      return { x: point.x, y: zone.bottom };
  }
};

const less = (left: Cost, right: Cost): boolean => {
  if (left.bends !== right.bends) {
    return left.bends < right.bends;
  }
  if (Math.abs(left.length - right.length) > EPSILON) {
    return left.length < right.length;
  }
  return left.squares < right.squares - EPSILON;
};

const add = (cost: Cost, bends: number, span: number): Cost => ({
  bends: cost.bends + bends,
  length: cost.length + span,
  // The sum of squares is least where a route's segments are most even, so a step turns halfway between its ends.
  squares: cost.squares + span * span,
});

/** The values in order, each once. */
const lines = (values: readonly number[]): number[] =>
  [...values]
    .sort((left, right) => left - right)
    .filter((value, index, all) => index === 0 || value - all[index - 1] > EPSILON);

const indexOf = (values: readonly number[], value: number): number =>
  values.findIndex((candidate) => Math.abs(candidate - value) <= EPSILON);

/**
 * The corners of the orthogonal route between two port ends, the ends included: each leaves its port along its side's
 * normal by `stub` (less where the two shapes stand closer than two stubs, which then share the gap), and the route
 * turns as seldom as it can without crossing either shape. Undefined where the shapes overlap, so nothing separates
 * them to route through.
 */
export const orthoRoute = (from: RouteEnd, to: RouteEnd, stub: number): Point[] | undefined => {
  const [source, target] = [rectOf(from), rectOf(to)];
  const gapX = Math.max(target.left - source.right, source.left - target.right);
  const gapY = Math.max(target.top - source.bottom, source.top - target.bottom);
  if (gapX <= 0 && gapY <= 0) {
    return undefined;
  }

  // The room kept round each shape: a stub on every side, but half the gap on a side that faces the other shape.
  const [nearX, nearY] = [Math.min(stub, gapX / 2), Math.min(stub, gapY / 2)];
  const zoneOf = (rect: Rect, other: Rect): Rect => ({
    left: rect.left - (gapX > 0 && other.right <= rect.left ? nearX : stub),
    right: rect.right + (gapX > 0 && other.left >= rect.right ? nearX : stub),
    top: rect.top - (gapY > 0 && other.bottom <= rect.top ? nearY : stub),
    bottom: rect.bottom + (gapY > 0 && other.top >= rect.bottom ? nearY : stub),
  });
  const zones = [zoneOf(source, target), zoneOf(target, source)];
  const [start, end] = [exitOf(from, zones[0]), exitOf(to, zones[1])];
  const [leave, land] = [HEADING[from.side], HEADING[to.side]];
  const [leaveStub, landStub] = [
    Math.abs(start.x - from.point.x) + Math.abs(start.y - from.point.y),
    Math.abs(end.x - to.point.x) + Math.abs(end.y - to.point.y),
  ];

  // A segment may run along the edge of a shape's room, never through it.
  const blocked = (left: Point, right: Point): boolean =>
    zones.some(
      (zone) =>
        Math.max(left.x, right.x) > zone.left + EPSILON &&
        Math.min(left.x, right.x) < zone.right - EPSILON &&
        Math.max(left.y, right.y) > zone.top + EPSILON &&
        Math.min(left.y, right.y) < zone.bottom - EPSILON,
    );

  // Ports that face each other on one line join straight.
  const ahead = (end.x - start.x) * HEADINGS[leave].x + (end.y - start.y) * HEADINGS[leave].y;
  const across = Math.abs((end.x - start.x) * HEADINGS[leave].y) + Math.abs((end.y - start.y) * HEADINGS[leave].x);
  if ((leave + 2) % 4 === land && across <= EPSILON && ahead >= -EPSILON && !blocked(start, end)) {
    return [from.point, to.point];
  }

  // The lines a route may run along: each elbow's own, the edges of each shape's room, and the middle of a gap.
  const xs = lines([
    start.x,
    end.x,
    ...zones.flatMap((zone) => [zone.left, zone.right]),
    ...(gapX > 0
      ? [source.right <= target.left ? (source.right + target.left) / 2 : (target.right + source.left) / 2]
      : []),
  ]);
  const ys = lines([
    start.y,
    end.y,
    ...zones.flatMap((zone) => [zone.top, zone.bottom]),
    ...(gapY > 0
      ? [source.bottom <= target.top ? (source.bottom + target.top) / 2 : (target.bottom + source.top) / 2]
      : []),
  ]);
  const at = (col: number, row: number): Point => ({ x: xs[col], y: ys[row] });
  const place = (col: number, row: number): number => col * ys.length + row;

  /** The crossings a segment from a crossing may end at, running `heading`, nearest first, with how far each is. */
  const reach = (col: number, row: number, heading: number): { col: number; row: number; span: number }[] => {
    const { x: stepX, y: stepY } = HEADINGS[heading];
    const origin = at(col, row);
    const reached: { col: number; row: number; span: number }[] = [];
    for (
      let [nextCol, nextRow] = [col + stepX, row + stepY];
      nextCol >= 0 && nextCol < xs.length && nextRow >= 0 && nextRow < ys.length;
      [nextCol, nextRow] = [nextCol + stepX, nextRow + stepY]
    ) {
      const point = at(nextCol, nextRow);
      if (blocked(origin, point)) {
        break;
      }
      reached.push({
        col: nextCol,
        row: nextRow,
        span: Math.abs(point.x - origin.x) + Math.abs(point.y - origin.y),
      });
    }
    return reached;
  };

  const [startCol, startRow, endCol, endRow] = [
    indexOf(xs, start.x),
    indexOf(ys, start.y),
    indexOf(xs, end.x),
    indexOf(ys, end.y),
  ];

  // Where the last segment may begin: on the line out of the target's port, and how far along it from the elbow.
  const landings = new Map<number, number>([
    [place(endCol, endRow), 0],
    ...reach(endCol, endRow, land).map(({ col, row, span }): [number, number] => [place(col, row), span]),
  ]);

  // Each state is a corner reached running one way; a move is a quarter turn and a whole segment, so every point of a
  // route found is a real corner.
  const known = new Map<number, Step>();
  const open: Step[] = [];
  const visit = (step: Step) => {
    const key = place(step.col, step.row) * 4 + step.heading;
    const best = known.get(key);
    if (!best || less(step.cost, best.cost)) {
      known.set(key, step);
      open.push(step);
    }
  };
  for (const { col, row, span } of [{ col: startCol, row: startRow, span: 0 }, ...reach(startCol, startRow, leave)]) {
    visit({ col, row, heading: leave, cost: add({ bends: 0, length: 0, squares: 0 }, 0, leaveStub + span) });
  }

  let found: { step: Step; cost: Cost } | undefined;
  while (open.length > 0) {
    let least = 0;
    for (let index = 1; index < open.length; index++) {
      if (less(open[index].cost, open[least].cost)) {
        least = index;
      }
    }
    const [step] = open.splice(least, 1);
    if (known.get(place(step.col, step.row) * 4 + step.heading) !== step) {
      continue;
    }
    const landing = landings.get(place(step.col, step.row));
    if (landing !== undefined && step.heading % 2 !== land % 2) {
      const cost = add(step.cost, 1, landing + landStub);
      if (!found || less(cost, found.cost)) {
        found = { step, cost };
      }
    }
    for (const heading of [(step.heading + 1) % 4, (step.heading + 3) % 4]) {
      for (const { col, row, span } of reach(step.col, step.row, heading)) {
        visit({ col, row, heading, cost: add(step.cost, 1, span), previous: step });
      }
    }
  }
  if (!found) {
    return undefined;
  }

  const corners: Point[] = [];
  for (let step: Step | undefined = found.step; step; step = step.previous) {
    corners.unshift(at(step.col, step.row));
  }
  return [from.point, ...corners, to.point];
};
