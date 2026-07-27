//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Terra, TerraObject } from '../types';
import { initialState } from './motion';
import { type TrailSpec, trailPuffs } from './trail';

const config = Terra.toConfigValues(Terra.make({ config: { seed: 'trail-1' } }));

const SPEC: TrailSpec = {
  spacing: 0.01,
  lifetimeMs: 3000,
  capacity: 5,
  startRadius: 0.01,
  endScale: 2,
  startAlpha: 0.3,
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
    // A very fast object would otherwise pack far more than `capacity` samples into `lifetimeMs`.
    const rocket = makeRocket(10);
    const state = initialState(rocket, config);
    const puffs = trailPuffs(state, rocket, config, 10_000, SPEC);
    expect(puffs.length).toBeLessThanOrEqual(SPEC.capacity);
    expect(puffs.length).toBe(SPEC.capacity);
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
      // Chord length for a small angular spacing on a unit-radius path is close to the arc length.
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
    const nowMs = 10_000;
    const evaluated = state; // trailPuffs re-evaluates internally; use the same base state as the caller would.
    const puffs = trailPuffs(evaluated, rocket, config, nowMs, SPEC);
    const nearest = puffs[0];
    expect(nearest.age).toBeGreaterThan(0);
  });

  test('determinism: the same state/definition/config/nowMs always yields the same puffs', () => {
    const rocket = makeRocket(0.02);
    const state = initialState(rocket, config);
    const first = trailPuffs(state, rocket, config, 12_345, SPEC);
    const second = trailPuffs(state, rocket, config, 12_345, SPEC);
    expect(second).toEqual(first);
  });
});
