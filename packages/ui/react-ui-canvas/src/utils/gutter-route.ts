//
// Copyright 2026 DXOS.org
//

//
// Gutter routing for smart links on a lattice scene (docs/DESIGN.md §8b): each end leaves its port
// straight out to the centre line of the gutter beside it, and the route between runs at right angles, with
// as few bends as it can, along gutter centre lines and the lines through its own ports. A port line runs
// straight through free cells, so a route detours into the gutters only around occupied ones; a gutter a
// multi-cell shape spans is covered by the shape, so it is not a track.
//

import { type Bounds, type Node, type Point } from '../model/index.ts';
import { type LatticeSpec, onLattice } from './lattice.ts';
import { sideNormal } from './ports.ts';
import { type RouteEnd } from './route.ts';
import { nodeBounds } from './shapes.ts';

/** A bend costs as much as this much distance: turns dominate, length breaks ties. */
const TURN_COST = 100_000;

/** Gutter lines beyond the ends and the shapes the search may use, so a route can go round the outermost. */
const MARGIN = 3;

const EPSILON = 1e-6;

/** Whether an axis-aligned segment passes through a frame's interior (touching its edge does not count). */
const crosses = (from: Point, to: Point, bounds: Bounds): boolean => {
  const [left, right] = [Math.min(from.x, to.x), Math.max(from.x, to.x)];
  const [top, bottom] = [Math.min(from.y, to.y), Math.max(from.y, to.y)];
  return (
    left < bounds.x + bounds.width - EPSILON &&
    right > bounds.x + EPSILON &&
    top < bounds.y + bounds.height - EPSILON &&
    bottom > bounds.y + EPSILON
  );
};

/** Where an end meets the gutter beside its port: straight out along the side's normal, half a gutter. */
const gutterExit = (end: RouteEnd, spec: LatticeSpec): Point => {
  const normal = sideNormal(end.side);
  return { x: end.point.x + (normal.x * spec.gutterX) / 2, y: end.point.y + (normal.y * spec.gutterY) / 2 };
};

/** The gutter centre lines (`(k + 1/2) x pitch`) in `[low, high]`, widened by `MARGIN` lines either side. */
const gutterLines = (low: number, high: number, pitch: number): number[] => {
  const first = Math.floor(low / pitch - 0.5) - MARGIN;
  const last = Math.ceil(high / pitch - 0.5) + MARGIN;
  return Array.from({ length: last - first + 1 }, (_, index) => (first + index + 0.5) * pitch);
};

type Region = { left: number; right: number; top: number; bottom: number };

/**
 * The span the search covers: the ends, grown by every frame within `MARGIN` pitches of them, so a way round
 * an obstacle is in range while a distant shape adds no lines to the grid. `transitive` keeps growing by the
 * frames near the grown span until none is left, for the rare detour round a chain of abutting shapes.
 */
const searchRegion = (
  start: Point,
  end: Point,
  frames: readonly Bounds[],
  pitchX: number,
  pitchY: number,
  transitive: boolean,
): Region => {
  const region: Region = {
    left: Math.min(start.x, end.x),
    right: Math.max(start.x, end.x),
    top: Math.min(start.y, end.y),
    bottom: Math.max(start.y, end.y),
  };
  const [reachX, reachY] = [MARGIN * pitchX, MARGIN * pitchY];
  const pending = new Set(frames);
  for (let grown = true; grown;) {
    grown = false;
    // A single pass measures nearness against the ends' span only, so one frame cannot pull in the next.
    const reach = { ...region };
    for (const frame of pending) {
      const span = transitive ? region : reach;
      const near =
        frame.x <= span.right + reachX &&
        frame.x + frame.width >= span.left - reachX &&
        frame.y <= span.bottom + reachY &&
        frame.y + frame.height >= span.top - reachY;
      if (near) {
        region.left = Math.min(region.left, frame.x);
        region.right = Math.max(region.right, frame.x + frame.width);
        region.top = Math.min(region.top, frame.y);
        region.bottom = Math.max(region.bottom, frame.y + frame.height);
        pending.delete(frame);
        grown = transitive;
      }
    }
  }
  return region;
};

const sortedUnique = (values: number[]): number[] =>
  [...new Set(values.map((value) => Math.round(value * 1000) / 1000))].sort((left, right) => left - right);

type Axis = 'h' | 'v';

/**
 * The polyline a smart link follows through the gutters, from `from`'s port to `to`'s: undefined when the
 * gutters offer no way round (the caller then falls back to the plain smart route).
 */
export const gutterRoute = (
  nodes: readonly Node[],
  spec: LatticeSpec,
  from: RouteEnd,
  to: RouteEnd,
): Point[] | undefined => gutterRouteWithCost(nodes, spec, from, to)?.points;

/** A gutter route and what it cost the search: `TURN_COST` a bend, plus its length. */
export type GutterRoute = { points: Point[]; cost: number };

/** {@link gutterRoute} with its cost, so routes between different ports can be compared. */
export const gutterRouteWithCost = (
  nodes: readonly Node[],
  spec: LatticeSpec,
  from: RouteEnd,
  to: RouteEnd,
): GutterRoute | undefined => {
  const [pitchX, pitchY] = [spec.width + spec.gutterX, spec.height + spec.gutterY];
  const start = gutterExit(from, spec);
  const end = gutterExit(to, spec);
  const frames = nodes.filter(onLattice).map(nodeBounds);
  // The local grid finds almost every route; only when it offers no way round does the search widen.
  const search = (transitive: boolean) =>
    searchGrid(from, to, start, end, frames, searchRegion(start, end, frames, pitchX, pitchY, transitive), spec);
  return search(false) ?? search(true);
};

/** Dijkstra over the gutter lines and port lines in `region`, from the gutter exit `start` to `end`. */
const searchGrid = (
  from: RouteEnd,
  to: RouteEnd,
  start: Point,
  end: Point,
  frames: readonly Bounds[],
  region: Region,
  spec: LatticeSpec,
): GutterRoute | undefined => {
  const [pitchX, pitchY] = [spec.width + spec.gutterX, spec.height + spec.gutterY];
  const verticals = gutterLines(region.left, region.right, pitchX);
  const horizontals = gutterLines(region.top, region.bottom, pitchY);
  const xs = sortedUnique([...verticals, start.x, end.x]);
  const ys = sortedUnique([...horizontals, start.y, end.y]);
  const [columns, rows] = [xs.length, ys.length];
  // Only frames overlapping the grid can block one of its segments.
  const grid = { x: xs[0], y: ys[0], width: xs[columns - 1] - xs[0], height: ys[rows - 1] - ys[0] };
  const near = frames.filter(
    (frame) =>
      frame.x < grid.x + grid.width + EPSILON &&
      frame.x + frame.width > grid.x - EPSILON &&
      frame.y < grid.y + grid.height + EPSILON &&
      frame.y + frame.height > grid.y - EPSILON,
  );
  // A horizontal segment can only pass through a frame its row line runs inside, and a vertical one through a frame
  // its column line runs inside.
  const acrossRow = ys.map((y) =>
    near.filter((frame) => y > frame.y + EPSILON && y < frame.y + frame.height - EPSILON),
  );
  const acrossColumn = xs.map((x) =>
    near.filter((frame) => x > frame.x + EPSILON && x < frame.x + frame.width - EPSILON),
  );
  // Each segment between neighbouring grid points is tested once, though the search reaches it from both axes:
  // 0 untested, 1 clear, 2 blocked; indexed by the segment's lower point.
  const blockedH = new Uint8Array(columns * rows);
  const blockedV = new Uint8Array(columns * rows);
  const clear = (i: number, j: number, ni: number, nj: number): boolean => {
    const [lowI, lowJ] = [Math.min(i, ni), Math.min(j, nj)];
    const horizontal = nj === j;
    const cache = horizontal ? blockedH : blockedV;
    const index = lowJ * columns + lowI;
    if (cache[index] === 0) {
      const a = { x: xs[i], y: ys[j] };
      const b = { x: xs[ni], y: ys[nj] };
      const candidates = horizontal ? acrossRow[j] : acrossColumn[i];
      cache[index] = candidates.some((frame) => crosses(a, b, frame)) ? 2 : 1;
    }
    return cache[index] === 1;
  };

  const indexOf = (values: number[], value: number) => values.indexOf(Math.round(value * 1000) / 1000);
  const [startI, startJ] = [indexOf(xs, start.x), indexOf(ys, start.y)];
  const [endI, endJ] = [indexOf(xs, end.x), indexOf(ys, end.y)];
  // The stub leaves along the side's normal, so the first run continuing that axis is not a bend.
  const axisOf = (end: RouteEnd): Axis => (end.side === 'e' || end.side === 'w' ? 'h' : 'v');

  // Dijkstra over (column, row, arriving axis), the open set a binary heap: a route is searched for each candidate
  // pair of ports, so each search must be cheap. A state is a number, `(row * columns + column) * 2 + axis`.
  const stateOf = (i: number, j: number, axis: Axis) => (j * columns + i) * 2 + (axis === 'h' ? 0 : 1);
  const cost = new Float64Array(columns * rows * 2).fill(Infinity);
  const previous = new Int32Array(columns * rows * 2).fill(-1);
  const open = new MinHeap<number>();
  const startState = stateOf(startI, startJ, axisOf(from));
  cost[startState] = 0;
  open.push(startState, 0);
  let best = -1;
  let bestCost = Infinity;
  while (open.size > 0) {
    const entry = open.pop();
    if (!entry) {
      break;
    }
    const current = entry.value;
    const currentCost = cost[current];
    // A state queued again at a lower cost leaves its older entry behind; skip the stale one.
    if (entry.priority > currentCost) {
      continue;
    }
    if (currentCost >= bestCost) {
      break;
    }
    const cell = current >> 1;
    const [ci, cj] = [cell % columns, Math.floor(cell / columns)];
    const currentAxis: Axis = (current & 1) === 0 ? 'h' : 'v';
    if (ci === endI && cj === endJ) {
      // Entering the target's stub off its axis is one more bend.
      const total = currentCost + (currentAxis === axisOf(to) ? 0 : TURN_COST);
      if (total < bestCost) {
        bestCost = total;
        best = current;
      }
      continue;
    }
    const steps: [number, number, Axis][] = [
      [ci - 1, cj, 'h'],
      [ci + 1, cj, 'h'],
      [ci, cj - 1, 'v'],
      [ci, cj + 1, 'v'],
    ];
    for (const [i, j, axis] of steps) {
      if (i < 0 || j < 0 || i >= columns || j >= rows) {
        continue;
      }
      if (!clear(ci, cj, i, j)) {
        continue;
      }
      const next = stateOf(i, j, axis);
      const nextCost =
        currentCost + Math.abs(xs[i] - xs[ci]) + Math.abs(ys[j] - ys[cj]) + (axis === currentAxis ? 0 : TURN_COST);
      if (nextCost < cost[next]) {
        cost[next] = nextCost;
        previous[next] = current;
        open.push(next, nextCost);
      }
    }
  }
  if (best < 0) {
    return undefined;
  }

  const corners: Point[] = [];
  for (let state = best; state >= 0; state = previous[state]) {
    const cell = state >> 1;
    corners.unshift({ x: xs[cell % columns], y: ys[Math.floor(cell / columns)] });
  }
  return { points: collapse([from.point, ...corners, to.point]), cost: bestCost };
};

/** A binary min-heap of values by priority. */
class MinHeap<T> {
  #items: { value: T; priority: number }[] = [];

  get size(): number {
    return this.#items.length;
  }

  push(value: T, priority: number): void {
    const items = this.#items;
    items.push({ value, priority });
    for (let index = items.length - 1; index > 0;) {
      const parent = (index - 1) >> 1;
      if (items[parent].priority <= items[index].priority) {
        break;
      }
      [items[parent], items[index]] = [items[index], items[parent]];
      index = parent;
    }
  }

  pop(): { value: T; priority: number } | undefined {
    const items = this.#items;
    const top = items[0];
    const last = items.pop();
    if (items.length > 0 && last) {
      items[0] = last;
      for (let index = 0; ;) {
        const [left, right] = [index * 2 + 1, index * 2 + 2];
        let smallest = index;
        if (left < items.length && items[left].priority < items[smallest].priority) {
          smallest = left;
        }
        if (right < items.length && items[right].priority < items[smallest].priority) {
          smallest = right;
        }
        if (smallest === index) {
          break;
        }
        [items[smallest], items[index]] = [items[index], items[smallest]];
        index = smallest;
      }
    }
    return top;
  }
}

/** Drops repeated points and the middle of any three collinear ones, so only the real bends remain. */
const collapse = (points: Point[]): Point[] => {
  const unique = points.filter(
    (point, index) => index === 0 || point.x !== points[index - 1].x || point.y !== points[index - 1].y,
  );
  return unique.filter((point, index) => {
    if (index === 0 || index === unique.length - 1) {
      return true;
    }
    const [before, after] = [unique[index - 1], unique[index + 1]];
    return !((before.x === point.x && point.x === after.x) || (before.y === point.y && point.y === after.y));
  });
};
