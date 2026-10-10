//
// Copyright 2026 DXOS.org
//

//
// Port ordering: the classic heuristic that the order of connectors along a box side should match
// the order in which they head off, so they fan out instead of swapping over next to the box. Each
// terminal is keyed by where its route turns after leaving the side, and the side's free terminals
// take lattice slots in key order around the ones that stay put.
//

import type * as Scene from './scene.ts';
import { type Rect } from './uml-grid.ts';

type Point = Scene.Point;

export type Side = 'top' | 'bottom' | 'left' | 'right';

/** A routed connector with the boxes its ends sit on. */
export type PortPath = {
  points: readonly Point[];
  source: Rect;
  target: Rect;
  /** Ends whose coordinate must not move (a straightened edge, or a face the router picked itself). */
  fixed?: { start?: boolean; end?: boolean };
};

/** New coordinates along the side for the ends that moved; an absent end keeps its place. */
export type Assigned = { start?: number; end?: number };

export type AssignOptions = {
  /** Slot spacing and minimum distance from a box corner. */
  step: number;
};

const EPSILON = 0.5;

/** Longer than any first segment, so a route that never turns sorts between the two turning fans. */
const STRAIGHT = 1e6;

/** The side of `rect` that `point` sits on, if any. */
export const sideOf = (point: Point, rect: Rect): Side | undefined => {
  const withinX = point.x >= rect.x - EPSILON && point.x <= rect.x + rect.w + EPSILON;
  const withinY = point.y >= rect.y - EPSILON && point.y <= rect.y + rect.h + EPSILON;
  if (withinX && Math.abs(point.y - rect.y) < EPSILON) {
    return 'top';
  }
  if (withinX && Math.abs(point.y - (rect.y + rect.h)) < EPSILON) {
    return 'bottom';
  }
  if (withinY && Math.abs(point.x - rect.x) < EPSILON) {
    return 'left';
  }
  if (withinY && Math.abs(point.x - (rect.x + rect.w)) < EPSILON) {
    return 'right';
  }
  return undefined;
};

const axisOf = (side: Side): 'x' | 'y' => (side === 'top' || side === 'bottom' ? 'x' : 'y');
const normalOf = (side: Side): 'x' | 'y' => (axisOf(side) === 'x' ? 'y' : 'x');

/**
 * Sort key of a terminal along its side, from its route read outward: a route turning toward the
 * side's high end belongs at the high end, and of two turning the same way the one that runs out
 * farther before turning sits nearer the low end, so neither turn-off cuts the other's stub.
 */
export const keyOf = (outward: readonly Point[], side: Side): number => {
  const axis = axisOf(side);
  const normal = normalOf(side);
  if (outward.length < 3) {
    return 0;
  }
  const [terminal, bend, next] = outward;
  const run = Math.abs(bend[normal] - terminal[normal]);
  const turn = Math.sign(next[axis] - bend[axis]);
  return turn === 0 ? 0 : turn * (STRAIGHT - run);
};

type Terminal = { path: number; end: 'start' | 'end'; coord: number; key: number; fixed: boolean };

/**
 * Lattice slots for `free` (already in key order) strictly between `low` and `high`, each as near
 * its current coordinate as order and spacing allow; undefined when they do not fit.
 */
const fit = (free: readonly Terminal[], low: number, high: number, step: number): number[] | undefined => {
  const snap = (value: number) => Math.round(value / step) * step;
  const first = Math.ceil((low + step - EPSILON) / step) * step;
  const last = Math.floor((high - step + EPSILON) / step) * step;
  if (free.length === 0) {
    return [];
  }
  if ((last - first) / step + 1 < free.length) {
    return undefined;
  }
  const slots: number[] = [];
  for (const [index, terminal] of free.entries()) {
    const floor = index === 0 ? first : slots[index - 1] + step;
    slots.push(Math.max(floor, snap(terminal.coord)));
  }
  for (let index = free.length - 1; index >= 0; index--) {
    const ceiling = index === free.length - 1 ? last : slots[index + 1] - step;
    slots[index] = Math.min(slots[index], ceiling);
  }
  return slots;
};

/**
 * Reorders the ports on every box side so they follow their routes' key order, moving only the
 * sides whose current order disagrees with it. Fixed terminals stay where they are and the free
 * ones take slots on the `step` lattice in the gaps between them, at least `step` from a corner.
 */
export const assign = (paths: readonly PortPath[], { step }: AssignOptions): Assigned[] => {
  const sides = new Map<string, { rect: Rect; side: Side; terminals: Terminal[] }>();
  const rectIds = new Map<Rect, number>();
  const idOf = (rect: Rect) => rectIds.get(rect) ?? rectIds.set(rect, rectIds.size).get(rect) ?? 0;
  paths.forEach((path, index) => {
    const ends = [
      { end: 'start' as const, rect: path.source, outward: path.points },
      { end: 'end' as const, rect: path.target, outward: [...path.points].reverse() },
    ];
    for (const { end, rect, outward } of ends) {
      const side = outward.length >= 2 ? sideOf(outward[0], rect) : undefined;
      if (!side) {
        continue;
      }
      const leaves = Math.abs(outward[1][axisOf(side)] - outward[0][axisOf(side)]) < EPSILON;
      const id = `${idOf(rect)}:${side}`;
      const entry = sides.get(id) ?? { rect, side, terminals: [] };
      entry.terminals.push({
        path: index,
        end,
        coord: outward[0][axisOf(side)],
        key: keyOf(outward, side),
        // A route that runs along its side before leaving it gives no direction to order by.
        fixed: Boolean(path.fixed?.[end]) || !leaves,
      });
      sides.set(id, entry);
    }
  });

  const result: Assigned[] = paths.map(() => ({}));
  for (const { rect, side, terminals } of sides.values()) {
    if (terminals.length < 2 || terminals.every((terminal) => terminal.fixed)) {
      continue;
    }
    const sorted = [...terminals].sort(
      (left, right) => left.key - right.key || left.coord - right.coord || left.path - right.path,
    );
    // Equal coordinates are a shared trunk, which the nudge splits; only distinct ones out of order cross.
    const inverted = sorted.some((terminal, index) => index > 0 && terminal.coord < sorted[index - 1].coord - EPSILON);
    if (!inverted) {
      continue;
    }
    const axis = axisOf(side);
    const [lowEdge, highEdge] = axis === 'x' ? [rect.x, rect.x + rect.w] : [rect.y, rect.y + rect.h];
    const fixed = sorted.filter((terminal) => terminal.fixed);
    // Fixed terminals must already be in key order for the free ones to fit around them.
    if (fixed.some((terminal, index) => index > 0 && terminal.coord < fixed[index - 1].coord - EPSILON)) {
      continue;
    }
    const bounds = [lowEdge, ...fixed.map((terminal) => terminal.coord), highEdge];
    const groups: Terminal[][] = bounds.slice(1).map(() => []);
    let gap = 0;
    for (const terminal of sorted) {
      if (terminal.fixed) {
        gap++;
      } else {
        groups[gap].push(terminal);
      }
    }
    const placed = groups.map((group, index) => fit(group, bounds[index], bounds[index + 1], step));
    if (placed.some((slots) => !slots)) {
      continue;
    }
    groups.forEach((group, index) =>
      group.forEach((terminal, position) => {
        const coord = placed[index]?.[position];
        if (coord !== undefined) {
          result[terminal.path][terminal.end] = coord;
        }
      }),
    );
  }
  return result;
};
