//
// Copyright 2026 DXOS.org
//

import { type TerraConfigValues, type Vec3, scale } from '../engine';
import { type TerraObject } from '../types';
import { type MotionContext, type ObjectState, evaluate } from './motion';

/** Per-kind tuning: emission spacing, puff lifetime, sample cap, and render-side sizing/alpha. */
export type TrailSpec = {
  spacing: number;
  lifetimeMs: number;
  capacity: number;
  startRadius: number;
  endScale: number;
  startAlpha: number;
};

/** Only the kinds the "Smoke trails" design calls for; every other kind leaves no trail. */
export const TRAIL_SPECS: Partial<Record<TerraObject.Kind, TrailSpec>> = {
  boat: { spacing: 0.012, lifetimeMs: 6000, capacity: 40, startRadius: 0.012, endScale: 2.5, startAlpha: 0.3 },
  plane: { spacing: 0.02, lifetimeMs: 8000, capacity: 40, startRadius: 0.01, endScale: 3, startAlpha: 0.35 },
  rocket: { spacing: 0.01, lifetimeMs: 3000, capacity: 48, startRadius: 0.014, endScale: 2, startAlpha: 0.45 },
};

/** A historical trail sample: a real past world position the object occupied, and its normalized age in `[0, 1)`. */
export type TrailPuff = { position: Vec3; age: number };

/**
 * The trail is the object's own real past positions, re-derived on demand from its closed-form
 * motion rather than accumulated frame by frame — `sim/` positions are already an exact function of
 * `(definition, config, elapsed)` (see the determinism contract), so the puff at age `a` is simply
 * `evaluate(state, definition, { config, elapsed: nowElapsed - a })`. This has no ring buffer to
 * drift, no dependency on render frame rate, and the same `(state, definition, config, nowMs)`
 * always yields the identical set of puffs.
 *
 * Ages are spaced by `spec.spacing / definition.speed` seconds, so puff separation reflects
 * `spec.spacing` radians of *distance* travelled at the object's own speed — a faster object trails
 * a longer wake, not a denser one — capped at `spec.capacity` samples. The nearest sample is one
 * spacing-step behind "now" (age 0 is skipped) so puffs never sample the object's own current hull
 * position; that skip is only ever a side effect of the sampling grid, never itself the mechanism
 * that shapes the trail's path.
 *
 * One caveat: for routed kinds (boat/plane), `state`'s `route`/`leg`/`legStart` are the *current*
 * leg's — correct for any sampled age at or after that leg began, but a sample reaching back past
 * the leg's own start clamps to the leg's start point (see `motion.ts`'s `evaluateRouted`) rather
 * than replaying the previous leg. This only affects puffs within one `lifetimeMs` window of a
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

  const ageStepMs = (spec.spacing / definition.speed) * 1000;
  const count = Math.min(spec.capacity, Math.floor(spec.lifetimeMs / ageStepMs));
  const elapsedNow = (nowMs - definition.spawnedAt) / 1000;

  const puffs: TrailPuff[] = [];
  for (let index = 1; index <= count; index++) {
    const ageMs = index * ageStepMs;
    const context: MotionContext = { config, elapsed: elapsedNow - ageMs / 1000 };
    const historical = evaluate(state, definition, context);
    puffs.push({ position: scale(historical.unit, historical.radius), age: ageMs / spec.lifetimeMs });
  }
  return puffs;
};
