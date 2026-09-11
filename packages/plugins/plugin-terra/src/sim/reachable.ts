//
// Copyright 2026 DXOS.org
//

import { type Vec3 } from '../engine/index.ts';
import { type Domain, type NavCell, type NavGrid, isPassable } from './nav-grid.ts';
import { planRoute } from './route.ts';

/**
 * Cells of `domain`, grouped into connected components via BFS over nav-grid neighbors, largest
 * first. Reachability guarantees — both for placing a new object and for picking its next
 * destination on arrival — only hold within a single connected component: arbitrary passable cells
 * can sit on a disconnected landmass (or, rarely, a disconnected sea).
 */
const largestComponent = (grid: NavGrid, domain: Domain): NavCell[] => {
  const componentOf = new Map<number, number>();
  const components: number[][] = [];
  for (const cell of grid.cells) {
    if (!isPassable(grid, cell.index, domain) || componentOf.has(cell.index)) {
      continue;
    }
    const members: number[] = [];
    const frontier = [cell.index];
    // A read cursor rather than `shift()`: the queue is drained in place, so no element is ever
    // `undefined` (which would need a cast to narrow) and no reindexing happens per BFS step.
    let read = 0;
    componentOf.set(cell.index, components.length);
    while (read < frontier.length) {
      const current = frontier[read++];
      members.push(current);
      for (const neighbor of grid.cells[current].neighbors) {
        if (!componentOf.has(neighbor) && isPassable(grid, neighbor, domain)) {
          componentOf.set(neighbor, components.length);
          frontier.push(neighbor);
        }
      }
    }
    components.push(members);
  }
  if (components.length === 0) {
    throw new Error(`domainCandidates: no passable ${domain} cells for this seed.`);
  }
  const best = components.reduce((largest, candidate) => (candidate.length > largest.length ? candidate : largest));
  return best.map((index) => grid.cells[index]);
};

/**
 * Cells solidly inside `domain`'s elevation band, away from its sea/land or slope-ceiling
 * threshold. A placed (or re-targeted) endpoint's lat/lng round-trips through the object's schema
 * before it is evaluated again, and a boundary cell can nudge onto an impassable neighbor after
 * that round trip.
 */
const safeCells = (grid: NavGrid, domain: Domain, cells: readonly NavCell[]): NavCell[] => {
  switch (domain) {
    case 'land': {
      const mid = grid.waterLevel + 0.175 * (1 - grid.waterLevel);
      const halfWidth = 0.175 * (1 - grid.waterLevel);
      return cells.filter((cell) => Math.abs(cell.elevation - mid) < halfWidth * 0.5);
    }
    case 'sea':
      return cells.filter((cell) => cell.elevation < grid.waterLevel * 0.9);
    case 'air':
      return [...cells];
  }
};

/**
 * `domain`'s safely-passable cells: the largest reachable component, narrowed to `safeCells`.
 * Shared by `Terra.makeDemoWorld`/`makeRandomObject` (initial placement) and `SimEngine`
 * (re-targeting on arrival) so both draw endpoints from the same reachability guarantee.
 */
export const domainCandidates = (grid: NavGrid, domain: Domain): NavCell[] =>
  safeCells(grid, domain, largestComponent(grid, domain));

export type PickReachableTargetOptions = {
  grid: NavGrid;
  domain: Domain;
  from: Vec3;
  /** A `[0, 1)` generator — a seeded PRNG for deterministic callers, `Math.random` otherwise. */
  random: () => number;
};

/**
 * A reachable destination for `domain`, starting from a `random()`-chosen candidate and walking
 * forward through the rest of `domainCandidates` deterministically until one has a non-empty route
 * from `from` — grid quantization at component boundaries can occasionally make the first pick
 * unreachable even though it belongs to the domain's largest connected component.
 */
export const pickReachableTarget = ({ grid, domain, from, random }: PickReachableTargetOptions): Vec3 => {
  const candidates = domainCandidates(grid, domain);
  const start = Math.floor(random() * candidates.length);
  for (let offset = 0; offset < candidates.length; offset++) {
    const candidate = candidates[(start + offset) % candidates.length];
    if (planRoute({ grid, domain, from, to: candidate.unit }).length > 0) {
      return candidate.unit;
    }
  }
  // Every candidate failed line-of-sight/A* from `from`: fall back to the `random()` pick anyway
  // rather than throwing — `routeFrom` will produce a single-point route and the object simply
  // tries again next leg.
  return candidates[start].unit;
};
