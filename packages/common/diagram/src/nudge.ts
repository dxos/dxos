//
// Copyright 2026 DXOS.org
//

import type * as Scene from './scene.ts';
import { type Rect } from './uml-grid.ts';

type Point = Scene.Point;
type Axis = 'h' | 'v';

/** One axis-aligned segment of a line: `points[start] → points[start + 1]`. */
type Run = { owner: number; start: number; axis: Axis; coord: number; lo: number; hi: number };

/** A routed connector: its orthogonal polyline and the boxes its ends are attached to. */
export type NudgePath = {
  points: readonly Point[];
  /** Box the first point sits on; without it the start port is never moved. */
  source?: Rect;
  /** Box the last point sits on; without it the end port is never moved. */
  target?: Rect;
};

export type NudgeOptions = {
  /** Gap between separated parallel runs (default 8). */
  spacing?: number;
  /** Boxes no run may be pushed through. */
  obstacles?: readonly Rect[];
  /** Lines that never move but that paths must not be pushed onto (e.g. an inheritance bus). */
  fixed?: readonly (readonly Point[])[];
  /** Minimum distance between a moved port and its box's corner (default `spacing`). */
  margin?: number;
};

const EPSILON = 0.5;

const along = (axis: Axis, point: Point) => (axis === 'v' ? point.y : point.x);
const across = (axis: Axis, point: Point) => (axis === 'v' ? point.x : point.y);
const sign = (value: number) => (value > EPSILON ? 1 : value < -EPSILON ? -1 : 0);

/** Drops repeated waypoints and the midpoints of straight runs, so each run is one maximal segment. */
const simplify = (points: readonly Point[]): Point[] => {
  const distinct = points.filter(
    (point, index) =>
      index === 0 ||
      Math.abs(point.x - points[index - 1].x) >= EPSILON ||
      Math.abs(point.y - points[index - 1].y) >= EPSILON,
  );
  return distinct.filter((point, index) => {
    if (index === 0 || index === distinct.length - 1) {
      return true;
    }
    const [previous, next] = [distinct[index - 1], distinct[index + 1]];
    const vertical = Math.abs(previous.x - point.x) < EPSILON && Math.abs(point.x - next.x) < EPSILON;
    const horizontal = Math.abs(previous.y - point.y) < EPSILON && Math.abs(point.y - next.y) < EPSILON;
    return !vertical && !horizontal;
  });
};

const runsOf = (points: readonly Point[], owner: number): Run[] =>
  points.slice(0, -1).flatMap((from, start): Run[] => {
    const to = points[start + 1];
    const axis: Axis | undefined =
      Math.abs(from.x - to.x) < EPSILON ? 'v' : Math.abs(from.y - to.y) < EPSILON ? 'h' : undefined;
    if (!axis) {
      return [];
    }
    const [a, b] = [along(axis, from), along(axis, to)];
    return [{ owner, start, axis, coord: across(axis, from), lo: Math.min(a, b), hi: Math.max(a, b) }];
  });

const shared = (left: Run, right: Run): boolean =>
  left.axis === right.axis &&
  Math.abs(left.coord - right.coord) < EPSILON &&
  Math.min(left.hi, right.hi) - Math.max(left.lo, right.lo) > EPSILON;

const crosses = (left: Run, right: Run): boolean => {
  if (left.axis === right.axis) {
    return false;
  }
  return (
    right.coord > left.lo + EPSILON &&
    right.coord < left.hi - EPSILON &&
    left.coord > right.lo + EPSILON &&
    left.coord < right.hi - EPSILON
  );
};

/** Length of the run inside the rect's interior; a run along a border or into a port is free. */
const interiorRun = (run: Run, rect: Rect): number => {
  const [crossLo, crossHi, alongLo, alongHi] =
    run.axis === 'v'
      ? [rect.x, rect.x + rect.w, rect.y, rect.y + rect.h]
      : [rect.y, rect.y + rect.h, rect.x, rect.x + rect.w];
  if (run.coord <= crossLo + EPSILON || run.coord >= crossHi - EPSILON) {
    return 0;
  }
  return Math.max(0, Math.min(run.hi, alongHi - EPSILON) - Math.max(run.lo, alongLo + EPSILON));
};

/**
 * Pairs `{changed, other}` related by `related`: per line pair, or per run pair with `perRun`, which
 * overlaps need so that separating one of two channels two lines share still lowers the count.
 */
const pairCount = (
  lines: readonly Point[][],
  changed: ReadonlySet<number>,
  related: (a: Run, b: Run) => boolean,
  perRun = false,
) => {
  const runs = lines.map((points, owner) => runsOf(points, owner));
  let count = 0;
  for (const owner of changed) {
    runs.forEach((others, other) => {
      if (other === owner || (changed.has(other) && other < owner)) {
        return;
      }
      if (perRun) {
        for (const run of runs[owner]) {
          count += others.filter((candidate) => related(run, candidate)).length;
        }
      } else if (runs[owner].some((run) => others.some((candidate) => related(run, candidate)))) {
        count++;
      }
    });
  }
  return count;
};

/** Collinear runs of different lines that overlap, grouped transitively along each shared line. */
const channelsOf = (lines: readonly Point[][], movable: number): Run[][] => {
  const runs = lines
    .flatMap((points, owner) => runsOf(points, owner))
    .sort((a, b) =>
      a.axis === b.axis
        ? Math.abs(a.coord - b.coord) < EPSILON
          ? a.lo - b.lo
          : a.coord - b.coord
        : a.axis < b.axis
          ? -1
          : 1,
    );
  const channels: Run[][] = [];
  let current: Run[] = [];
  let reach = -Infinity;
  const flush = () => {
    const owners = new Set(current.map((run) => run.owner));
    // A line that doubles back on itself, or a channel of fixed lines alone, is not ours to separate.
    if (owners.size > 1 && owners.size === current.length && current.some((run) => run.owner < movable)) {
      channels.push(current);
    }
  };
  for (const run of runs) {
    const head = current[0];
    if (head && head.axis === run.axis && Math.abs(head.coord - run.coord) < EPSILON && run.lo < reach - EPSILON) {
      current.push(run);
      reach = Math.max(reach, run.hi);
    } else {
      flush();
      current = [run];
      reach = run.hi;
    }
  }
  flush();
  return channels;
};

/** Side (−1, 0, +1 across the run) the line turns toward at the run's low or high end; 0 at a terminal. */
const turn = (lines: readonly Point[][], run: Run, end: 'lo' | 'hi'): number => {
  const points = lines[run.owner];
  const startIsLow = along(run.axis, points[run.start]) < along(run.axis, points[run.start + 1]);
  const neighbor = (end === 'lo') === startIsLow ? run.start - 1 : run.start + 2;
  return neighbor < 0 || neighbor >= points.length ? 0 : sign(across(run.axis, points[neighbor]) - run.coord);
};

/**
 * Order across the channel that keeps each run's turn-offs from cutting the others: a run that
 * leaves the shared stretch early sits on the side it turns toward.
 */
const order = (lines: readonly Point[][], channel: readonly Run[]): Run[] => {
  const compare = (left: Run, right: Run): number => {
    let vote = 0;
    if (left.lo > right.lo + EPSILON) {
      vote += turn(lines, left, 'lo');
    } else if (right.lo > left.lo + EPSILON) {
      vote -= turn(lines, right, 'lo');
    } else {
      vote += sign(turn(lines, left, 'lo') - turn(lines, right, 'lo'));
    }
    if (left.hi < right.hi - EPSILON) {
      vote += turn(lines, left, 'hi');
    } else if (right.hi < left.hi - EPSILON) {
      vote -= turn(lines, right, 'hi');
    } else {
      vote += sign(turn(lines, left, 'hi') - turn(lines, right, 'hi'));
    }
    return vote !== 0 ? vote : left.owner - right.owner;
  };
  return [...channel].sort(compare);
};

/**
 * Shift one run across its axis by `offset`, dragging the adjacent waypoints with it so the line
 * stays orthogonal; undefined when that would detach a port, reverse a neighbour or crush an end stub.
 */
const shift = (
  points: readonly Point[],
  run: Run,
  offset: number,
  path: NudgePath | undefined,
  spacing: number,
  margin: number,
): Point[] | undefined => {
  const move = (point: Point): Point =>
    run.axis === 'v' ? { x: point.x + offset, y: point.y } : { x: point.x, y: point.y + offset };
  const next = points.map((point, index) => (index === run.start || index === run.start + 1 ? move(point) : point));
  const last = points.length - 1;
  for (const [index, rect] of [
    [0, path?.source],
    [last, path?.target],
  ] as const) {
    if (index !== run.start && index !== run.start + 1) {
      continue;
    }
    // A port slides along its own side only: the side must lie across the run, and the port must stay clear of the corners.
    const port = points[index];
    if (!rect) {
      return undefined;
    }
    const [sideLo, sideHi, crossLo, crossHi] =
      run.axis === 'v'
        ? [rect.y, rect.y + rect.h, rect.x, rect.x + rect.w]
        : [rect.x, rect.x + rect.w, rect.y, rect.y + rect.h];
    const onSide =
      Math.abs(along(run.axis, port) - sideLo) < EPSILON || Math.abs(along(run.axis, port) - sideHi) < EPSILON;
    const moved = across(run.axis, next[index]);
    if (!onSide || moved < crossLo + margin - EPSILON || moved > crossHi - margin + EPSILON) {
      return undefined;
    }
  }
  for (const segment of [run.start - 1, run.start + 1]) {
    if (segment < 0 || segment >= last) {
      continue;
    }
    const before = across(run.axis, points[segment + 1]) - across(run.axis, points[segment]);
    const after = across(run.axis, next[segment + 1]) - across(run.axis, next[segment]);
    if (sign(after) !== 0 && sign(after) !== sign(before)) {
      return undefined;
    }
    // End stubs carry the arrowhead and the port's exit direction, so they may not shrink below one step.
    const terminal = segment === 0 || segment === last - 1;
    if (terminal && Math.abs(after) < Math.min(Math.abs(before), spacing) - EPSILON) {
      return undefined;
    }
  }
  return next;
};

type Candidate = { lines: Point[][]; overlaps: number; crossings: number; reversed: number; travel: number };

/**
 * Separates the runs of one channel by `spacing`, preferring the channel's order; tries every window
 * of offsets (and single moves as a fallback) and keeps the one that resolves the most overlaps
 * without adding crossings or cutting through a box.
 */
const separate = (
  lines: readonly Point[][],
  channel: readonly Run[],
  paths: readonly NudgePath[],
  obstacles: readonly Rect[],
  spacing: number,
  margin: number,
): Point[][] | undefined => {
  const movable = paths.length;
  const fixed = channel.filter((run) => run.owner >= movable);
  if (fixed.length > 1) {
    return undefined;
  }
  const sorted = order(lines, channel);
  const assignments: { offsets: Map<Run, number>; reversed: number }[] = [];
  [sorted, [...sorted].reverse()].forEach((ordered, reversed) => {
    const anchor = ordered.findIndex((run) => run.owner >= movable);
    const shifts = anchor >= 0 ? [-anchor] : ordered.map((_, index) => -index);
    for (const base of shifts) {
      assignments.push({
        offsets: new Map(ordered.map((run, index) => [run, (index + base) * spacing])),
        reversed,
      });
    }
  });
  for (const run of channel) {
    if (run.owner < movable) {
      for (const steps of [1, -1, 2, -2]) {
        assignments.push({ offsets: new Map([[run, steps * spacing]]), reversed: 1 });
      }
    }
  }

  const changedOf = (offsets: Map<Run, number>) =>
    new Set([...offsets].filter(([, offset]) => offset !== 0).map(([run]) => run.owner));
  const obstructed = (candidate: readonly Point[][], owners: ReadonlySet<number>) =>
    [...owners].reduce(
      (total, owner) =>
        total +
        runsOf(candidate[owner], owner).filter((run) => obstacles.some((rect) => interiorRun(run, rect) > EPSILON))
          .length,
      0,
    );

  let best: Candidate | undefined;
  for (const { offsets, reversed } of assignments) {
    const changed = changedOf(offsets);
    if (changed.size === 0 || [...changed].some((owner) => owner >= movable)) {
      continue;
    }
    const candidate = [...lines];
    let valid = true;
    for (const [run, offset] of offsets) {
      if (offset === 0) {
        continue;
      }
      const moved = shift(lines[run.owner], run, offset, paths[run.owner], spacing, margin);
      if (!moved) {
        valid = false;
        break;
      }
      candidate[run.owner] = moved;
    }
    if (!valid) {
      continue;
    }
    const overlaps = pairCount(candidate, changed, shared, true);
    const crossings = pairCount(candidate, changed, crosses);
    const overlapsBefore = pairCount(lines, changed, shared, true);
    // A crossing still reads as two lines and a shared run does not, so each overlap resolved may cost one crossing.
    if (
      overlaps >= overlapsBefore ||
      crossings - pairCount(lines, changed, crosses) > overlapsBefore - overlaps ||
      obstructed(candidate, changed) > obstructed(lines, changed)
    ) {
      continue;
    }
    const travel = [...offsets.values()].reduce((total, offset) => total + Math.abs(offset), 0);
    const better =
      !best ||
      overlaps < best.overlaps ||
      (overlaps === best.overlaps &&
        (crossings < best.crossings ||
          (crossings === best.crossings &&
            (reversed < best.reversed || (reversed === best.reversed && travel < best.travel)))));
    if (better) {
      best = { lines: candidate, overlaps, crossings, reversed, travel };
    }
  }
  return best?.lines.map((points, owner) => (points === lines[owner] ? points : simplify(points)));
};

/**
 * Nudging (Wybrow, Marriott & Stuckey 2010): distinct connectors that share a collinear run are
 * pulled apart across it by `spacing`, ordered so their turn-offs do not cross, with ports sliding
 * along their box side. Fixed lines (a deliberate bus) never move. Paths that need no change come
 * back as given.
 */
export const nudge = (paths: readonly NudgePath[], options: NudgeOptions = {}): Point[][] => {
  const { spacing = 8, obstacles = [], fixed = [], margin = spacing } = options;
  let lines: Point[][] = [...paths.map((path) => simplify(path.points)), ...fixed.map((points) => [...points])];
  const touched = new Set<number>();
  const attempted = new Set<string>();
  const signature = (channel: readonly Run[]) =>
    `${channel[0].axis}:${Math.round(channel[0].coord)}:${channel
      .map((run) => `${run.owner}@${Math.round(run.lo)}-${Math.round(run.hi)}`)
      .sort()
      .join(',')}`;
  // Each separation strictly lowers the overlap count and a failed channel is never retried, so this terminates.
  for (;;) {
    const channel = channelsOf(lines, paths.length).find((candidate) => !attempted.has(signature(candidate)));
    if (!channel) {
      break;
    }
    attempted.add(signature(channel));
    const next = separate(lines, channel, paths, obstacles, spacing, margin);
    if (next) {
      next.forEach((points, owner) => points !== lines[owner] && touched.add(owner));
      lines = next;
    }
  }
  return paths.map((path, owner) => (touched.has(owner) ? lines[owner] : [...path.points]));
};
