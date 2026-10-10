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

import { type Bounds, type Node, type Point } from '../model/types.ts';
import { type LatticeSpec } from './lattice.ts';
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
): Point[] | undefined => {
  const [pitchX, pitchY] = [spec.width + spec.gutterX, spec.height + spec.gutterY];
  const start = gutterExit(from, spec);
  const end = gutterExit(to, spec);
  const frames = nodes.map(nodeBounds);
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
): Point[] | undefined => {
  const [pitchX, pitchY] = [spec.width + spec.gutterX, spec.height + spec.gutterY];
  const verticals = gutterLines(region.left, region.right, pitchX);
  const horizontals = gutterLines(region.top, region.bottom, pitchY);
  const xs = sortedUnique([...verticals, start.x, end.x]);
  const ys = sortedUnique([...horizontals, start.y, end.y]);
  const clear = (a: Point, b: Point) => !frames.some((frame) => crosses(a, b, frame));

  const indexOf = (values: number[], value: number) => values.indexOf(Math.round(value * 1000) / 1000);
  const [startI, startJ] = [indexOf(xs, start.x), indexOf(ys, start.y)];
  const [endI, endJ] = [indexOf(xs, end.x), indexOf(ys, end.y)];
  // The stub leaves along the side's normal, so the first run continuing that axis is not a bend.
  const axisOf = (end: RouteEnd): Axis => (end.side === 'e' || end.side === 'w' ? 'h' : 'v');

  // Dijkstra over (column, row, arriving axis); the grid is a few dozen lines a side, so a linear scan of
  // the open set is cheap enough.
  type State = { i: number; j: number; axis: Axis };
  const key = ({ i, j, axis }: State) => `${i},${j},${axis}`;
  const cost = new Map<string, number>();
  const previous = new Map<string, State>();
  const open: State[] = [];
  const startState: State = { i: startI, j: startJ, axis: axisOf(from) };
  cost.set(key(startState), 0);
  open.push(startState);
  let best: State | undefined;
  let bestCost = Infinity;
  while (open.length > 0) {
    open.sort((left, right) => (cost.get(key(left)) ?? Infinity) - (cost.get(key(right)) ?? Infinity));
    const current = open.shift();
    if (!current) {
      break;
    }
    const currentCost = cost.get(key(current)) ?? Infinity;
    if (currentCost >= bestCost) {
      break;
    }
    if (current.i === endI && current.j === endJ) {
      // Entering the target's stub off its axis is one more bend.
      const total = currentCost + (current.axis === axisOf(to) ? 0 : TURN_COST);
      if (total < bestCost) {
        bestCost = total;
        best = current;
      }
      continue;
    }
    const here = { x: xs[current.i], y: ys[current.j] };
    const steps: [number, number, Axis][] = [
      [current.i - 1, current.j, 'h'],
      [current.i + 1, current.j, 'h'],
      [current.i, current.j - 1, 'v'],
      [current.i, current.j + 1, 'v'],
    ];
    for (const [i, j, axis] of steps) {
      if (i < 0 || j < 0 || i >= xs.length || j >= ys.length) {
        continue;
      }
      const there = { x: xs[i], y: ys[j] };
      if (!clear(here, there)) {
        continue;
      }
      const next: State = { i, j, axis };
      const nextCost =
        currentCost + Math.abs(there.x - here.x) + Math.abs(there.y - here.y) + (axis === current.axis ? 0 : TURN_COST);
      if (nextCost < (cost.get(key(next)) ?? Infinity)) {
        cost.set(key(next), nextCost);
        previous.set(key(next), current);
        open.push(next);
      }
    }
  }
  if (!best) {
    return undefined;
  }

  const corners: Point[] = [];
  for (let state: State | undefined = best; state; state = previous.get(key(state))) {
    corners.unshift({ x: xs[state.i], y: ys[state.j] });
  }
  return collapse([from.point, ...corners, to.point]);
};

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
