//
// Copyright 2026 DXOS.org
//

import { type TerraConfigValues, type Vec3 } from '../engine';
import { TerraObject } from '../types';
import { toUnit } from './geo';
import { type MotionContext, type ObjectState, REPLAN_INTERVAL_SECONDS, evaluate, initialState } from './motion';
import { type NavGrid } from './nav-grid';
import { planRoute } from './route';

/** Millisecond form of `motion.REPLAN_INTERVAL_SECONDS`, derived here so the two modules share one source of truth. */
export const REPLAN_INTERVAL_MS = REPLAN_INTERVAL_SECONDS * 1000;

/** Bounds the per-`evaluateAt` catch-up recurrence after a long-backgrounded tab. */
export const MAX_CATCHUP_WINDOWS = 8;

/** An object paired with its current simulated state. */
export type SimObject = { definition: TerraObject.TerraObject; state: ObjectState };

/** The kinds whose motion follows a replanned route rather than a closed-form path. */
const isRoutedKind = (kind: TerraObject.Kind): boolean => kind === 'boat' || kind === 'tank' || kind === 'plane';

/** The unit-sphere destination for a routed object, or `undefined` if it has none to replan toward. */
const routedTarget = (definition: TerraObject.TerraObject): Vec3 | undefined =>
  isRoutedKind(definition.kind) && definition.target ? toUnit(definition.target) : undefined;

/** A route beginning at `from` (the object's position at the window's start) and ending at `target`. */
const routeFrom = (grid: NavGrid, definition: TerraObject.TerraObject, target: Vec3, from: Vec3): Vec3[] => {
  const domain = TerraObject.domainFor(definition.kind);
  return [from, ...planRoute({ grid, domain, from, to: target })];
};

/**
 * Advances one replan window: evaluates the current route to its full duration, then replans a
 * fresh route from that position. Pure given `(state, definition, config, grid, target)` — the
 * position at window `n`'s start follows by induction from spawn, never from wall-clock deltas
 * between calls.
 */
const advanceWindow = (
  state: ObjectState,
  definition: TerraObject.TerraObject,
  config: TerraConfigValues,
  grid: NavGrid,
  target: Vec3,
): ObjectState => {
  const windowEndElapsed = (state.windowIndex + 1) * REPLAN_INTERVAL_SECONDS;
  const advanced = evaluate(state, definition, { config, elapsed: windowEndElapsed });
  return {
    ...advanced,
    route: routeFrom(grid, definition, target, advanced.unit),
    windowIndex: state.windowIndex + 1,
  };
};

/**
 * The state at `nowMs`, replaying replan windows in order up to `MAX_CATCHUP_WINDOWS`. Closed-form
 * kinds, and routed kinds with no target or no grid, skip the recurrence entirely.
 */
const evaluateObject = (
  definition: TerraObject.TerraObject,
  state: ObjectState,
  nowMs: number,
  config: TerraConfigValues,
  grid: NavGrid | undefined,
): ObjectState => {
  const context: MotionContext = { config, elapsed: (nowMs - definition.spawnedAt) / 1000 };
  const target = grid ? routedTarget(definition) : undefined;

  if (!grid || !target) {
    return evaluate(state, definition, context);
  }

  const targetWindow = Math.floor((nowMs - definition.spawnedAt) / REPLAN_INTERVAL_MS);

  let next = state;
  let iterations = 0;
  while (next.windowIndex < targetWindow && iterations < MAX_CATCHUP_WINDOWS) {
    next = advanceWindow(next, definition, config, grid, target);
    iterations++;
  }

  if (next.windowIndex < targetWindow) {
    // The gap exceeded the catch-up cap: snap ahead and replan from the best position estimate
    // rather than replaying an unbounded number of windows. The one documented divergence point.
    const positionNow = evaluate(next, definition, context);
    next = { ...positionNow, route: routeFrom(grid, definition, target, positionNow.unit), windowIndex: targetWindow };
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
  const target = grid ? routedTarget(definition) : undefined;
  if (!grid || !target) {
    return { definition, state };
  }
  return { definition, state: { ...state, route: routeFrom(grid, definition, target, state.unit) } };
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
