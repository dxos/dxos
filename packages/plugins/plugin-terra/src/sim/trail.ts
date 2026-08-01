//
// Copyright 2026 DXOS.org
//

import { type TerraConfigValues, type Vec3, add, scale, sub } from '../engine';
import { type TerraObject } from '../types';
import { tangentFrame } from './geo';
import { type MotionContext, type ObjectState, evaluate } from './motion';

const DEG = Math.PI / 180;

/** Per-kind tuning: emission spacing, puff lifetime, sample cap, and render-side sizing/alpha. */
export type TrailSpec = {
  spacing: number;
  lifetimeMs: number;
  capacity: number;
  startRadius: number;
  endScale: number;
  startAlpha: number;
  /** Angular distance the emission point sits behind the object's own origin, clearing its tail. */
  aftOffset: number;
};

/** Only the kinds the "Smoke trails" design calls for; every other kind leaves no trail. */
export const TRAIL_SPECS: Partial<Record<TerraObject.Kind, TrailSpec>> = {
  // Live puff count is `lifetimeMs / (spacing / speed * 1000)`, capped by `capacity`. Spacing is
  // tight so the puffs read as a continuous plume, and the lifetime is short so only ~20 are alive
  // at once — each stays planted where it was emitted, so the wake is visibly left behind.
  boat: {
    spacing: 0.003,
    lifetimeMs: 3000,
    capacity: 24,
    startRadius: 0.01,
    endScale: 2.5,
    startAlpha: 0.3,
    aftOffset: 0.005,
  },
  plane: {
    spacing: 0.005,
    lifetimeMs: 3500,
    capacity: 24,
    startRadius: 0.009,
    endScale: 3,
    startAlpha: 0.35,
    aftOffset: 0.02,
  },
  rocket: {
    spacing: 0.0025,
    lifetimeMs: 1400,
    capacity: 30,
    startRadius: 0.012,
    endScale: 2,
    startAlpha: 0.45,
    aftOffset: 0.024,
  },
};

/** A historical trail sample: a stable world position the puff was born at, and its normalized age in `[0, 1)`. */
export type TrailPuff = { position: Vec3; age: number };

/**
 * A puff is born the instant an emission tick falls due, not sampled backward from "now" — that
 * distinction is what keeps puffs planted in the air instead of sliding along with the object.
 * Emission ticks sit on a fixed grid of absolute times `t_k = definition.spawnedAt + k * intervalMs`
 * for integer `k >= 0`, where `intervalMs = (spec.spacing / definition.speed) * 1000` — the interval
 * that makes consecutive ticks `spec.spacing` radians of *distance* apart at the object's own speed,
 * not a fixed wall-clock cadence. Puff `k`'s world position is `evaluate(state, definition, {
 * config, elapsed: (t_k - spawnedAt) / 1000 })`'s position — a pure function of `k` alone, so it is
 * identical on every frame and for every peer regardless of when `nowMs` sampled it. Its age is
 * simply `nowMs - t_k`; a puff is shown while that age is within `[0, spec.lifetimeMs)`.
 *
 * Because `t_k` never depends on `nowMs`, the *set* of visible puffs slides forward one tick at a
 * time as `nowMs` advances, but no individual puff's own position ever changes — it only ages
 * (fades and grows) in place while the object flies on past it. Capped at `spec.capacity` samples.
 *
 * One caveat: for routed kinds (boat/plane), `state`'s `route`/`leg`/`legStart` are the *current*
 * leg's — correct for any tick at or after that leg began, but a tick reaching back past the leg's
 * own start clamps to the leg's start point (see `motion.ts`'s `evaluateRouted`) rather than
 * replaying the previous leg. This only affects puffs within one `lifetimeMs` window of a
 * re-target, and self-heals as those puffs age out — deliberately not solved by replaying the full
 * leg history here, which would reintroduce the per-frame bookkeeping this approach removes.
 */
export const trailPuffs = (
  state: ObjectState,
  definition: TerraObject.TerraObject,
  config: TerraConfigValues,
  nowMs: number,
  spec: TrailSpec,
): TrailPuff[] => {
  if (definition.speed <= 0) {
    return [];
  }

  const intervalMs = (spec.spacing / definition.speed) * 1000;
  const elapsedNowMs = nowMs - definition.spawnedAt;
  // The largest tick strictly before `elapsedNowMs`, so the freshest puff never sits exactly on the
  // object's own current position — `ceil(...) - 1` (rather than `floor`) guarantees strictness even
  // when `elapsedNowMs` lands exactly on a tick.
  const latestTick = Math.ceil(elapsedNowMs / intervalMs) - 1;

  const puffs: TrailPuff[] = [];
  for (let tick = latestTick; tick >= 0 && puffs.length < spec.capacity; tick--) {
    const birthMs = tick * intervalMs;
    const age = elapsedNowMs - birthMs;
    // Ages only grow as `tick` decreases, so once the oldest allowed age is passed, every earlier
    // tick is expired too.
    if (age >= spec.lifetimeMs) {
      break;
    }
    const context: MotionContext = { config, elapsed: birthMs / 1000 };
    const historical = evaluate(state, definition, context);
    // A rocket only exhausts on the way up. Testing the puff's own birth-time fraction (not the
    // rocket's current one) keeps ascent puffs visible as it falls, instead of the plume vanishing
    // the instant it tips over the apex.
    if (definition.kind === 'rocket' && historical.flightFraction >= APEX_FRACTION) {
      continue;
    }
    puffs.push({ position: behindHull(historical, spec), age: age / spec.lifetimeMs });
  }
  return puffs;
};

/** Flight fraction at which a ballistic arc stops climbing; past this the rocket is descending. */
const APEX_FRACTION = 0.5;

/**
 * `historical`'s world position, moved back along the axis it was *flying* at that instant by the
 * kind's `aftOffset`, so the puff leaves the tail rather than the middle of the form. The axis is
 * pitched off the local horizontal by `state.pitch`, exactly as the mesh is drawn: offsetting along
 * the ground track alone would hang a climbing rocket's exhaust out beside its arc instead of below
 * it, which is the whole plume for a near-vertical launch. Purely cosmetic — it never affects
 * emission timing or spacing.
 */
const behindHull = (historical: ObjectState, spec: TrailSpec): Vec3 => {
  const { north, east } = tangentFrame(historical.unit);
  const heading = historical.bearing * DEG;
  const tangent = add(scale(north, Math.cos(heading)), scale(east, Math.sin(heading)));
  const forward = add(scale(tangent, Math.cos(historical.pitch)), scale(historical.unit, Math.sin(historical.pitch)));
  // `aftOffset` is an angular offset, so it becomes a world distance at the object's own radius.
  return sub(scale(historical.unit, historical.radius), scale(forward, spec.aftOffset * historical.radius));
};
