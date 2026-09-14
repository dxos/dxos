//
// Copyright 2026 DXOS.org
//

import { type TerraConfigValues, type Vec3, add, scale, sub } from '../engine/index.ts';
import * as TerraObject from '../types/TerraObject.ts';
import { tangentFrame } from './geo.ts';
import { type MotionContext, type ObjectState, evaluate } from './motion.ts';

const DEG = Math.PI / 180;

/** Per-kind tuning: emission spacing, puff lifetime, sample cap, and render-side sizing/alpha. */
export type TrailSpec = {
  spacing: number;
  lifetimeMs: number;
  capacity: number;
  startRadius: number;
  /** Puff radius at the end of its life, relative to `startRadius`: above 1 it spreads, 0 tapers it away to nothing. */
  endScale: number;
  startAlpha: number;
  /** Angular distance the emission point sits behind the object's own origin, clearing its tail. */
  aftOffset: number;
  /** Puff colour, linear RGB. Exhaust burns; a wake does not — a rocket's plume is flame, a boat's is spray. */
  color: [number, number, number];
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
    color: [1, 1, 1],
  },
  plane: {
    spacing: 0.005,
    lifetimeMs: 3500,
    capacity: 24,
    startRadius: 0.009,
    endScale: 3,
    startAlpha: 0.35,
    aftOffset: 0.02,
    color: [1, 1, 1],
  },
  rocket: {
    // A short, dense plume rather than a smoke column back to the pad: exhaust dissipates fast, and
    // a long one hides the very thing the trail is there to show, which is the rocket's attitude.
    spacing: 0.002,
    lifetimeMs: 500,
    capacity: 12,
    startRadius: 0.022,
    // Tapers to nothing: a plume is widest at the nozzle and thins out behind, where a wake or a
    // vapour trail spreads as it disperses.
    endScale: 0,
    startAlpha: 0.5,
    aftOffset: 0.024,
    // Burning propellant, shading toward the flame at the nozzle rather than the white of a wake.
    color: [1, 0.55, 0.16],
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

  // A rocket burns for the first part of its arc and coasts the rest, and a cut engine leaves no
  // plume: the exhaust goes with it rather than hanging in the air behind. Read off the *current*
  // phase, so the whole trail disappears the instant the burn ends.
  if (definition.kind === 'rocket' && state.phase !== 'boost') {
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
    puffs.push({ position: behindHull(historical, spec), age: age / spec.lifetimeMs });
  }
  return puffs;
};

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
