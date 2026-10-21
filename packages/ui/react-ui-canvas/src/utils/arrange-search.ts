//
// Copyright 2026 DXOS.org
//

//
// Local search over slots: a layered order cannot put a node beside its neighbour or see how links actually route,
// so this improves a seed arrangement against a score of the drawn result (crossings, bends, length).
//

import { type Point } from '../model/index.ts';
import { type Slot } from './arrange.ts';

/** Lower is better. */
export type SlotScore = (slots: ReadonlyMap<string, Slot>) => number;

export type ImproveOptions = {
  /** How far, in slots, a node may move or find a node to swap with. */
  reach?: number;
  /** Passes over every node; the search also stops at the first pass that improves nothing. */
  passes?: number;
};

const keyOf = ({ column, row }: Slot) => `${column},${row}`;

/**
 * Hill-climbing from `seed`: each node in turn tries every free slot and every other node within `reach`, and takes
 * the move or swap that lowers `score` most. Deterministic: nodes and candidates are visited in a fixed order.
 */
export const improveSlots = (
  seed: ReadonlyMap<string, Slot>,
  score: SlotScore,
  { reach = 1, passes = 4 }: ImproveOptions = {},
): Map<string, Slot> => {
  let current = new Map(seed);
  let best = score(current);
  const ids = [...current.keys()].sort();
  for (let pass = 0; pass < passes; pass++) {
    let improved = false;
    for (const id of ids) {
      const from = current.get(id);
      if (!from) {
        continue;
      }
      const occupant = new Map([...current].map(([other, slot]) => [keyOf(slot), other]));
      let choice: Map<string, Slot> | undefined;
      for (let row = from.row - reach; row <= from.row + reach; row++) {
        for (let column = from.column - reach; column <= from.column + reach; column++) {
          const to = { column, row };
          if (row < 0 || keyOf(to) === keyOf(from)) {
            continue;
          }
          const other = occupant.get(keyOf(to));
          const candidate = new Map(current);
          candidate.set(id, to);
          if (other) {
            candidate.set(other, from);
          }
          const value = score(candidate);
          if (value < best) {
            best = value;
            choice = candidate;
          }
        }
      }
      if (choice) {
        current = choice;
        improved = true;
      }
    }
    if (!improved) {
      break;
    }
  }
  return normalize(current);
};

/** Shifted so the leftmost column and the top row are zero. */
const normalize = (slots: ReadonlyMap<string, Slot>): Map<string, Slot> => {
  const minColumn = Math.min(...[...slots.values()].map(({ column }) => column));
  const minRow = Math.min(...[...slots.values()].map(({ row }) => row));
  return new Map([...slots].map(([id, { column, row }]) => [id, { column: column - minColumn, row: row - minRow }]));
};

/** What a set of routed polylines costs to read: how often they cross, how often they turn, and how far they run. */
export type RouteCost = { crossings: number; bends: number; length: number };

/** The cost of `routes`, each a polyline of its ends and corners. */
export const routeCost = (routes: readonly (readonly Point[])[]): RouteCost => {
  const segments = routes.map((points) => points.slice(1).map((point, index) => [points[index], point] as const));
  let crossings = 0;
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      crossings += segments[i].reduce(
        (sum, left) => sum + segments[j].filter((right) => properlyCross(left[0], left[1], right[0], right[1])).length,
        0,
      );
    }
  }
  const bends = routes.reduce((sum, points) => sum + Math.max(0, points.length - 2), 0);
  const length = routes.reduce(
    (sum, points) =>
      sum +
      points
        .slice(1)
        .reduce((run, point, index) => run + Math.hypot(point.x - points[index].x, point.y - points[index].y), 0),
    0,
  );
  return { crossings, bends, length };
};

const cross = (origin: Point, a: Point, b: Point) =>
  (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);

/** Whether two segments cross at a point inside both; touching ends and collinear runs are not crossings. */
const properlyCross = (a: Point, b: Point, c: Point, d: Point): boolean => {
  const [d1, d2, d3, d4] = [cross(c, d, a), cross(c, d, b), cross(a, b, c), cross(a, b, d)];
  return d1 * d2 < 0 && d3 * d4 < 0;
};
