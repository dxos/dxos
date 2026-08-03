//
// Copyright 2026 DXOS.org
//

import seedrandom from 'seedrandom';

import { type TerraConfigValues, type Vec3 } from '../engine';
import * as TerraObject from '../types/TerraObject';
import { toUnit } from './geo';
import { type MotionContext, type ObjectState, evaluate, initialState, routeLength } from './motion';
import { type NavGrid } from './nav-grid';
import { pickReachableTarget } from './reachable';
import { planRoute } from './route';

/**
 * Bounds the per-`evaluateAt` leg catch-up recurrence after a long-backgrounded tab (or a run of
 * legs whose picked destinations happen to be very short). Without a cap, a long-idle client could
 * otherwise need to replay an unbounded number of legs to reach `nowMs`.
 */
export const MAX_CATCHUP_LEGS = 8;

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

/** A route beginning at `from` (a leg's start position) and ending at `target`. */
const routeFrom = (grid: NavGrid, definition: TerraObject.TerraObject, target: Vec3, from: Vec3): Vec3[] => {
  const domain = TerraObject.domainFor(definition.kind);
  return [from, ...planRoute({ grid, domain, from, to: target })];
};

/**
 * How long, in seconds, constant-`speed` travel takes to walk `route` end to end. `Infinity` when
 * `speed` is non-positive, so a stalled object is never considered to have finished its leg (and
 * `cursorAt`'s loop below terminates rather than spinning on a zero-duration leg).
 */
const legDuration = (route: readonly Vec3[], speed: number): number =>
  speed > 0 ? routeLength(route) / speed : Infinity;

/** A leg in progress: its number, the (spawn-relative) elapsed second it began, and its route. */
type LegCursor = { leg: number; legStart: number; route: Vec3[] };

/** The unit-sphere point `cursor`'s route currently ends at — i.e. where its next leg, if any, begins. */
const cursorEnd = (cursor: LegCursor, fallback: Vec3): Vec3 => cursor.route.at(-1) ?? fallback;

/**
 * The leg after `cursor`: a fresh destination seeded by `(config.seed, definition.id, leg)`, routed
 * from wherever the previous leg ended, starting the instant the previous leg's own arc length was
 * fully walked at `speed`. Pure given its arguments — a leg's start position and time follow by
 * induction from spawn, never from wall-clock deltas between calls, so legs are variable-length but
 * still a closed-form recurrence.
 */
const advanceLeg = (
  definition: TerraObject.TerraObject,
  config: TerraConfigValues,
  grid: NavGrid,
  initialTarget: Vec3,
  cursor: LegCursor,
): LegCursor => {
  const from = cursorEnd(cursor, initialTarget);
  const leg = cursor.leg + 1;
  const target = legTarget(definition, leg, initialTarget, config, grid, from);
  return {
    leg,
    legStart: cursor.legStart + legDuration(cursor.route, definition.speed),
    route: routeFrom(grid, definition, target, from),
  };
};

/**
 * The leg containing `elapsed`, walking forward one arrival at a time from `start` — each leg's own
 * duration (its route's arc length over `speed`) decides when the next begins, so a re-target never
 * waits on a fixed clock: a fast object's legs are short, a slow object's are long, and there is no
 * dead time at an arrival. Bounded by `MAX_CATCHUP_LEGS`; past the cap, snaps straight to a leg
 * starting at `elapsed` rather than replaying an unbounded number of legs. The one documented
 * divergence point (mirrors the old fixed-window design's catch-up cap).
 */
const cursorAt = (
  definition: TerraObject.TerraObject,
  config: TerraConfigValues,
  grid: NavGrid,
  initialTarget: Vec3,
  elapsed: number,
  start: LegCursor,
): LegCursor => {
  let cursor = start;
  let iterations = 0;
  while (elapsed - cursor.legStart >= legDuration(cursor.route, definition.speed) && iterations < MAX_CATCHUP_LEGS) {
    cursor = advanceLeg(definition, config, grid, initialTarget, cursor);
    iterations++;
  }

  if (elapsed - cursor.legStart >= legDuration(cursor.route, definition.speed)) {
    const from = cursorEnd(cursor, initialTarget);
    const leg = cursor.leg + 1;
    const target = legTarget(definition, leg, initialTarget, config, grid, from);
    cursor = { leg, legStart: elapsed, route: routeFrom(grid, definition, target, from) };
  }

  return cursor;
};

/**
 * The state at `nowMs`, walking the leg recurrence forward from `state`. Closed-form kinds, and
 * routed kinds placed with no target to begin with, skip the recurrence entirely.
 */
const evaluateObject = (
  definition: TerraObject.TerraObject,
  state: ObjectState,
  nowMs: number,
  config: TerraConfigValues,
  grid: NavGrid | undefined,
): ObjectState => {
  const elapsed = (nowMs - definition.spawnedAt) / 1000;
  const context: MotionContext = { config, elapsed };
  const initialTarget = grid ? initialTargetFor(definition) : undefined;

  if (!grid || !initialTarget) {
    return evaluate(state, definition, context);
  }

  const cursor = cursorAt(definition, config, grid, initialTarget, elapsed, {
    leg: state.leg,
    legStart: state.legStart,
    route: state.route,
  });

  return evaluate({ ...state, leg: cursor.leg, legStart: cursor.legStart, route: cursor.route }, definition, context);
};

/** The spawn-time state for `definition`: leg 0's route, planned from its source, if a grid is available. */
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
