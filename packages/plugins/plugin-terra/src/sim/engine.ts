//
// Copyright 2026 DXOS.org
//

import seedrandom from 'seedrandom';

import { type TerraConfigValues, type Vec3 } from '../engine';
import { TerraObject } from '../types';
import { toUnit } from './geo';
import { type MotionContext, type ObjectState, REPLAN_INTERVAL_SECONDS, evaluate, initialState } from './motion';
import { type NavGrid } from './nav-grid';
import { pickReachableTarget } from './reachable';
import { planRoute } from './route';

/** Millisecond form of `motion.REPLAN_INTERVAL_SECONDS`, derived here so the two modules share one source of truth. */
export const REPLAN_INTERVAL_MS = REPLAN_INTERVAL_SECONDS * 1000;

/** Bounds the per-`evaluateAt` catch-up recurrence after a long-backgrounded tab. */
export const MAX_CATCHUP_WINDOWS = 8;

/** An object paired with its current simulated state. */
export type SimObject = { definition: TerraObject.TerraObject; state: ObjectState };

/** The kinds whose motion follows a replanned route rather than a closed-form path. */
const isRoutedKind = (kind: TerraObject.Kind): boolean => kind === 'boat' || kind === 'tank' || kind === 'plane';

/** The unit-sphere destination `definition` was placed with, or `undefined` if it has none to route toward at all. */
const initialTargetFor = (definition: TerraObject.TerraObject): Vec3 | undefined =>
  isRoutedKind(definition.kind) && definition.target ? toUnit(definition.target) : undefined;

/**
 * The destination for `leg`: `initialTarget` (the object's placed target) for leg 0, otherwise a
 * reachable point seeded by the world's seed, the object's own stable ECHO id, and the leg number —
 * so every peer re-derives the same sequence of destinations without any of them ever being stored.
 * `pickReachableTarget` reuses the same nav-grid + `planRoute` reachability that
 * `Terra.makeDemoWorld` places objects with, rather than duplicating it.
 */
const legTarget = (
  definition: TerraObject.TerraObject,
  leg: number,
  initialTarget: Vec3,
  config: TerraConfigValues,
  grid: NavGrid,
  from: Vec3,
): Vec3 => {
  if (leg === 0) {
    return initialTarget;
  }
  return pickReachableTarget({
    grid,
    domain: TerraObject.domainFor(definition.kind),
    from,
    random: seedrandom(`${config.seed}:${definition.id}:${leg}`),
  });
};

/** A route beginning at `from` (the object's position at the window's start) and ending at `target`. */
const routeFrom = (grid: NavGrid, definition: TerraObject.TerraObject, target: Vec3, from: Vec3): Vec3[] => {
  const domain = TerraObject.domainFor(definition.kind);
  return [from, ...planRoute({ grid, domain, from, to: target })];
};

/**
 * Advances one replan window: evaluates the current route to its full duration, then replans a
 * fresh route from that position — toward a newly seeded destination if the object reached the end
 * of its route during the window (advancing `leg`), or toward the same destination otherwise. Pure
 * given `(state, definition, config, grid, initialTarget)` — the position at window `n`'s start
 * follows by induction from spawn, never from wall-clock deltas between calls.
 */
const advanceWindow = (
  state: ObjectState,
  definition: TerraObject.TerraObject,
  config: TerraConfigValues,
  grid: NavGrid,
  initialTarget: Vec3,
): ObjectState => {
  const windowEndElapsed = (state.windowIndex + 1) * REPLAN_INTERVAL_SECONDS;
  const advanced = evaluate(state, definition, { config, elapsed: windowEndElapsed });
  const leg = advanced.arrived ? state.leg + 1 : state.leg;
  const target = legTarget(definition, leg, initialTarget, config, grid, advanced.unit);
  return {
    ...advanced,
    route: routeFrom(grid, definition, target, advanced.unit),
    windowIndex: state.windowIndex + 1,
    leg,
  };
};

/**
 * The state at `nowMs`, replaying replan windows in order up to `MAX_CATCHUP_WINDOWS`. Closed-form
 * kinds, and routed kinds placed with no target to begin with, skip the recurrence entirely.
 */
const evaluateObject = (
  definition: TerraObject.TerraObject,
  state: ObjectState,
  nowMs: number,
  config: TerraConfigValues,
  grid: NavGrid | undefined,
): ObjectState => {
  const context: MotionContext = { config, elapsed: (nowMs - definition.spawnedAt) / 1000 };
  const initialTarget = grid ? initialTargetFor(definition) : undefined;

  if (!grid || !initialTarget) {
    return evaluate(state, definition, context);
  }

  const targetWindow = Math.floor((nowMs - definition.spawnedAt) / REPLAN_INTERVAL_MS);

  let next = state;
  let iterations = 0;
  while (next.windowIndex < targetWindow && iterations < MAX_CATCHUP_WINDOWS) {
    next = advanceWindow(next, definition, config, grid, initialTarget);
    iterations++;
  }

  if (next.windowIndex < targetWindow) {
    // The gap exceeded the catch-up cap: snap ahead and replan from the best position estimate
    // rather than replaying an unbounded number of windows. The one documented divergence point.
    const positionNow = evaluate(next, definition, context);
    const leg = positionNow.arrived ? next.leg + 1 : next.leg;
    const target = legTarget(definition, leg, initialTarget, config, grid, positionNow.unit);
    next = {
      ...positionNow,
      route: routeFrom(grid, definition, target, positionNow.unit),
      windowIndex: targetWindow,
      leg,
    };
  }

  return evaluate(next, definition, context);
};

/** The spawn-time state for `definition`: window 0's route, planned from its source, if a grid is available. */
const spawn = (
  definition: TerraObject.TerraObject,
  config: TerraConfigValues,
  grid: NavGrid | undefined,
): SimObject => {
  const state = initialState(definition, config);
  const initialTarget = grid ? initialTargetFor(definition) : undefined;
  if (!grid || !initialTarget) {
    return { definition, state };
  }
  return { definition, state: { ...state, route: routeFrom(grid, definition, initialTarget, state.unit) } };
};

/**
 * Advances a set of `TerraObject` definitions to an absolute point in time. Deterministic: the
 * same definitions evaluated at the same `nowMs` reach the same state regardless of how many, or
 * which, intermediate times were evaluated first.
 */
export class SimEngine {
  readonly #config: TerraConfigValues;
  readonly #definitions: readonly TerraObject.TerraObject[];
  readonly #grid: NavGrid | undefined;
  #objects: SimObject[];

  constructor(options: { config: TerraConfigValues; definitions: readonly TerraObject.TerraObject[]; grid?: NavGrid }) {
    this.#config = options.config;
    this.#definitions = options.definitions;
    this.#grid = options.grid;
    this.#objects = this.#definitions.map((definition) => spawn(definition, this.#config, this.#grid));
  }

  get objects(): readonly SimObject[] {
    return this.#objects;
  }

  /** Brings every object to its state at absolute `nowMs`. */
  evaluateAt(nowMs: number): void {
    this.#objects = this.#objects.map((object) => ({
      definition: object.definition,
      state: evaluateObject(object.definition, object.state, nowMs, this.#config, this.#grid),
    }));
  }

  /** Restores every object to its spawn-time state. */
  reset(): void {
    this.#objects = this.#definitions.map((definition) => spawn(definition, this.#config, this.#grid));
  }
}
