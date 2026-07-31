//
// Copyright 2026 DXOS.org
//

import { type Vec3, add, normalize, scale } from '../engine';
import { angleBetween } from './geo';
import { type Domain, type NavGrid, isPassable } from './nav-grid';

export type RouteRequest = {
  grid: NavGrid;
  domain: Domain;
  from: Vec3;
  to: Vec3;
  cruiseElevation?: number;
};

/** Samples along a great-circle segment when testing whether it can be flown/sailed directly. */
const SMOOTHING_SAMPLES = 6;

/** Interpolates along the great circle between two unit vectors. */
const slerp = (from: Vec3, to: Vec3, fraction: number): Vec3 => {
  const angle = angleBetween(from, to);
  if (angle < 1e-9) {
    return from;
  }
  const sin = Math.sin(angle);
  const left = Math.sin((1 - fraction) * angle) / sin;
  const right = Math.sin(fraction * angle) / sin;
  return normalize(add(scale(from, left), scale(to, right)));
};

/**
 * Plans a route between two points, avoiding cells the domain cannot traverse. Returns smoothed
 * waypoints ending at `to`, or an empty array when the destination is unreachable.
 */
export const planRoute = ({ grid, domain, from, to, cruiseElevation }: RouteRequest): Vec3[] => {
  const start = grid.findNearest(from);
  const goal = grid.findNearest(to);
  const passable = (index: number): boolean => isPassable(grid, index, domain, cruiseElevation);
  if (!passable(start) || !passable(goal)) {
    return [];
  }

  if (start === goal) {
    return [to];
  }

  const heuristic = (index: number): number => angleBetween(grid.cells[index].unit, grid.cells[goal].unit);
  const cameFrom = new Map<number, number>();
  const costSoFar = new Map<number, number>([[start, 0]]);
  // A small grid makes a linear-scan frontier cheaper than maintaining a heap.
  const frontier = new Set<number>([start]);
  let reachedGoal = false;

  while (frontier.size > 0) {
    let current = -1;
    let bestEstimate = Infinity;
    for (const index of frontier) {
      const estimate = (costSoFar.get(index) ?? Infinity) + heuristic(index);
      if (estimate < bestEstimate) {
        bestEstimate = estimate;
        current = index;
      }
    }
    if (current === goal) {
      reachedGoal = true;
      break;
    }

    frontier.delete(current);
    for (const neighbor of grid.cells[current].neighbors) {
      if (!passable(neighbor)) {
        continue;
      }
      const step = angleBetween(grid.cells[current].unit, grid.cells[neighbor].unit);
      const cost = (costSoFar.get(current) ?? Infinity) + step;
      if (cost < (costSoFar.get(neighbor) ?? Infinity)) {
        costSoFar.set(neighbor, cost);
        cameFrom.set(neighbor, current);
        frontier.add(neighbor);
      }
    }
  }

  if (!reachedGoal) {
    return [];
  }

  // Walk cameFrom back from the goal to the start, then reverse: the loop always terminates
  // because start has no cameFrom entry, and reaching `goal` here guarantees every cell on the
  // way was chained back to it during relaxation, so the `?? start` fallback is never exercised.
  const cellPath: Vec3[] = [];
  for (let index = goal; index !== start; index = cameFrom.get(index) ?? start) {
    cellPath.push(grid.cells[index].unit);
  }
  cellPath.reverse();

  // Line-of-sight smoothing: drop a waypoint whenever the direct segment past it stays passable.
  const clear = (segmentStart: Vec3, segmentEnd: Vec3): boolean => {
    for (let sample = 1; sample < SMOOTHING_SAMPLES; sample++) {
      const point = slerp(segmentStart, segmentEnd, sample / SMOOTHING_SAMPLES);
      if (!passable(grid.findNearest(point))) {
        return false;
      }
    }
    return true;
  };

  const smoothed: Vec3[] = [];
  let anchor = from;
  for (let index = 0; index < cellPath.length; index++) {
    const next = index + 1 < cellPath.length ? cellPath[index + 1] : to;
    if (clear(anchor, next)) {
      // The waypoint is redundant: the straight segment past it is still passable.
      continue;
    }
    smoothed.push(cellPath[index]);
    anchor = cellPath[index];
  }

  smoothed.push(to);
  return smoothed;
};
