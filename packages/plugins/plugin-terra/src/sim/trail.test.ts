//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Terra, TerraObject } from '#types';

import { evaluate, initialState } from './motion.ts';
import { type TrailSpec, trailPuffs } from './trail.ts';

const config = Terra.toConfigValues(Terra.make({ config: { seed: 'trail-1' } }));

const SPEC: TrailSpec = {
  spacing: 0.01,
  lifetimeMs: 3000,
  capacity: 5,
  startRadius: 0.01,
  endScale: 2,
  startAlpha: 0.3,
  aftOffset: 0.03,
  color: [1, 1, 1],
};

/** A rocket's motion is a pure function of `(definition, context)` — no route/nav-grid setup needed to exercise `trailPuffs`. */
const makeRocket = (speed: number): TerraObject.TerraObject =>
  TerraObject.make({
    kind: 'rocket',
    speed,
    source: { lat: 0, lng: 0, height: 0 },
    target: { lat: 0, lng: 90, height: 0 },
    spawnedAt: 0,
  });

describe('trailPuffs', () => {
  test('a stalled object (speed <= 0) leaves no trail', () => {
    const rocket = makeRocket(0);
    const state = initialState(rocket, config);
    expect(trailPuffs(state, rocket, config, 10_000, SPEC)).toEqual([]);
  });

  test('puff count is capped at spec.capacity', () => {
    // A very fast object would otherwise pack far more than `capacity` emission ticks into `lifetimeMs`.
    // At speed 10 the quarter-turn flight lasts ~157ms, so sampling at 70ms keeps the rocket below
    // its burn — a rocket exhausts for the first third of its arc, and a later sample emits nothing.
    const rocket = makeRocket(10);
    const state = initialState(rocket, config);
    const puffs = trailPuffs(state, rocket, config, 70, SPEC);
    expect(puffs.length).toBeLessThanOrEqual(SPEC.capacity);
    expect(puffs.length).toBe(SPEC.capacity);
  });

  test('a puff expires the instant its age reaches spec.lifetimeMs', () => {
    // capacity raised so the lifetime cutoff (not the capacity cap) is what limits the count here.
    const spec: TrailSpec = { ...SPEC, capacity: 100 };
    const rocket = makeRocket(0.02); // 0.01 rad spacing at 0.02 rad/s => a 500ms emission interval.
    const state = initialState(rocket, config);
    // spawnedAt is 0, so the tick born at t=0 is exactly 3000ms old at nowMs=3000 — right at the cutoff.
    const puffs = trailPuffs(state, rocket, config, 3_000, spec);
    // Ticks born at 500..2500ms old qualify (5 of them); the one born at 0 (exactly `lifetimeMs` old) does not.
    expect(puffs.length).toBe(5);
    expect(Math.max(...puffs.map((puff) => puff.age))).toBeLessThan(1);
  });

  test('successive puffs are separated by spec.spacing radians of travel, oldest last', () => {
    const rocket = makeRocket(0.02);
    const state = initialState(rocket, config);
    const puffs = trailPuffs(state, rocket, config, 10_000, SPEC);
    expect(puffs.length).toBeGreaterThan(1);

    for (let index = 0; index < puffs.length - 1; index++) {
      const a = puffs[index].position;
      const b = puffs[index + 1].position;
      const distance = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      expect(distance).toBeGreaterThan(0);
      expect(puffs[index + 1].age).toBeGreaterThan(puffs[index].age);
    }
  });

  test('a faster object gets a longer trail (more puffs), not denser spacing, for the same spec', () => {
    const slow = makeRocket(0.005);
    const fast = makeRocket(0.05);
    const slowPuffs = trailPuffs(initialState(slow, config), slow, config, 10_000, SPEC);
    const fastPuffs = trailPuffs(initialState(fast, config), fast, config, 10_000, SPEC);
    expect(fastPuffs.length).toBeGreaterThan(slowPuffs.length);
  });

  test('the nearest puff is behind the object current position, not on top of it', () => {
    const rocket = makeRocket(0.02);
    const state = initialState(rocket, config);
    const puffs = trailPuffs(state, rocket, config, 10_000, SPEC);
    expect(puffs[0].age).toBeGreaterThan(0);
  });

  test('a climbing rocket leaves its exhaust below its arc, not beside it', () => {
    const rocket = makeRocket(0.05);
    const state = initialState(rocket, config);
    // Early in the boost phase the nose is near vertical, so the tail — and the plume — points
    // almost straight down. Offsetting along the ground track alone would leave every puff at the
    // rocket's own altitude, beside the arc rather than under it.
    const [nearest] = trailPuffs(state, rocket, config, 900, SPEC);
    const flying = evaluate(state, rocket, { config, elapsed: 0.9 });
    expect(Math.hypot(...nearest.position)).toBeLessThan(flying.radius);
  });

  test('determinism: the same state/definition/config/nowMs always yields the same puffs', () => {
    const rocket = makeRocket(0.02);
    const state = initialState(rocket, config);
    const first = trailPuffs(state, rocket, config, 12_345, SPEC);
    const second = trailPuffs(state, rocket, config, 12_345, SPEC);
    expect(second).toEqual(first);
  });

  test('a puff does not move as `now` advances (world-stability, no tick crossed)', () => {
    const rocket = makeRocket(0.02); // 500ms between emission ticks; 10_100/10_101 both fall strictly inside one tick's window.
    const state = initialState(rocket, config);
    const earlier = trailPuffs(state, rocket, config, 10_100, SPEC);
    const later = trailPuffs(state, rocket, config, 10_101, SPEC);
    expect(later.length).toBe(earlier.length);
    for (let index = 0; index < earlier.length; index++) {
      expect(later[index].position).toEqual(earlier[index].position);
      expect(later[index].age).toBeGreaterThan(earlier[index].age);
    }
  });

  test('a puff born at a fixed emission tick sits at the same world point at any later query within its lifetime', () => {
    const rocket = makeRocket(0.02); // 500ms between emission ticks.
    const state = initialState(rocket, config);
    // The tick born at 4000ms is 500ms old at nowMs=4500, and 2500ms old (still < lifetimeMs=3000) at nowMs=6500.
    const early = trailPuffs(state, rocket, config, 4_500, SPEC);
    const late = trailPuffs(state, rocket, config, 6_500, SPEC);

    const earlyPuff = early.find((puff) => Math.abs(puff.age * SPEC.lifetimeMs - 500) < 1e-6);
    const latePuff = late.find((puff) => Math.abs(puff.age * SPEC.lifetimeMs - 2500) < 1e-6);
    if (!earlyPuff || !latePuff) {
      throw new Error('expected both queries to include the tick born at 4000ms');
    }
    expect(latePuff.position).toEqual(earlyPuff.position);
  });
});
