//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { makeSampler, radiusAt, seaRadius } from '../engine';
import * as Terra from '../types/Terra';
import * as TerraObject from '../types/TerraObject';
import { angleBetween, bearingTo, toUnit } from './geo';
import { type ObjectState, evaluate, initialState, walkRoute } from './motion';

const config = Terra.toConfigValues(Terra.make({ config: { seed: 'motion-1' } }));

describe('walkRoute', () => {
  const a = toUnit({ lat: 0, lng: 0 });
  const b = toUnit({ lat: 0, lng: 10 });
  const c = toUnit({ lat: 0, lng: 20 });
  const route = [a, b, c];

  test('distance 0 returns the first point', () => {
    const result = walkRoute(route, 0);
    expect(result.unit[0]).toBeCloseTo(a[0], 9);
    expect(result.unit[1]).toBeCloseTo(a[1], 9);
    expect(result.unit[2]).toBeCloseTo(a[2], 9);
  });

  test('a distance beyond the total length returns the last point, done', () => {
    const result = walkRoute(route, 1000);
    expect(result.done).toBe(true);
    expect(result.unit[0]).toBeCloseTo(c[0], 9);
    expect(result.unit[1]).toBeCloseTo(c[1], 9);
    expect(result.unit[2]).toBeCloseTo(c[2], 9);
  });

  test('half the total length of a two-equal-segment route returns the midpoint', () => {
    const totalAngle = Math.acos(Math.min(1, Math.max(-1, a[0] * c[0] + a[1] * c[1] + a[2] * c[2])));
    const result = walkRoute(route, totalAngle / 2);
    expect(result.unit[0]).toBeCloseTo(b[0], 6);
    expect(result.unit[1]).toBeCloseTo(b[1], 6);
    expect(result.unit[2]).toBeCloseTo(b[2], 6);
  });

  test('bearing points along the segment (due east on the equator)', () => {
    const result = walkRoute(route, 0);
    expect(result.bearing).toBeCloseTo(90, 4);
  });

  test('an empty route does not throw', () => {
    expect(() => walkRoute([], 5)).not.toThrow();
  });

  test('a single-point route does not throw and returns that point, done', () => {
    const result = walkRoute([a], 5);
    expect(result.done).toBe(true);
    expect(result.unit).toEqual(a);
  });

  test('a zero-length segment is skipped without dividing by zero', () => {
    const duplicated = [a, a, c];
    expect(() => walkRoute(duplicated, 0.001)).not.toThrow();
    const result = walkRoute(duplicated, 0.001);
    expect(Number.isFinite(result.unit[0])).toBe(true);
    expect(Number.isFinite(result.bearing)).toBe(true);
  });

  // Regression: on an inclined (non-equatorial, non-meridian) great-circle segment, the true course
  // drifts continuously along its length, so mid-segment bearing must track the traveled-to point —
  // not the segment's start point, which only agrees with the true course at fraction 0.
  test('mid-segment bearing matches the true course at the traveled-to point, not the segment start', () => {
    const start = toUnit({ lat: 10, lng: 10 });
    const end = toUnit({ lat: 50, lng: 70 });
    const inclined = [start, end];
    const total = angleBetween(start, end);

    const midway = walkRoute(inclined, total * 0.5);
    const justAhead = walkRoute(inclined, total * 0.5001);
    const trueCourseAtMidpoint = bearingTo(midway.unit, justAhead.unit);

    expect(midway.bearing).toBeCloseTo(trueCourseAtMidpoint, 1);
    // The segment's initial bearing is a meaningfully different angle on an inclined segment —
    // guards against silently reverting to `bearingTo(start, end)`.
    let driftFromStart = Math.abs(midway.bearing - bearingTo(start, end));
    driftFromStart = driftFromStart > 180 ? 360 - driftFromStart : driftFromStart;
    expect(driftFromStart).toBeGreaterThan(1);
  });

  test('the arrival bearing is the course at the route end, not the last segment start', () => {
    const start = toUnit({ lat: 10, lng: 10 });
    const end = toUnit({ lat: 50, lng: 70 });
    const inclined = [start, end];
    const total = angleBetween(start, end);

    const arrived = walkRoute(inclined, total * 1.1);
    const justBefore = walkRoute(inclined, total * 0.9999);
    const trueCourseAtEnd = bearingTo(justBefore.unit, arrived.unit);

    expect(arrived.done).toBe(true);
    expect(arrived.bearing).toBeCloseTo(trueCourseAtEnd, 1);
  });
});

describe('evaluate — determinism (the key property)', () => {
  const boat = TerraObject.make({
    kind: 'boat',
    speed: 0.02,
    source: { lat: 0, lng: 0, height: 0 },
    target: { lat: 0, lng: 60, height: 0 },
    spawnedAt: 0,
  });

  test('calling evaluate twice with the same elapsed returns identical state', () => {
    const state = initialState(boat, config);
    const first = evaluate(state, boat, { config, elapsed: 10 });
    const second = evaluate(state, boat, { config, elapsed: 10 });
    expect(second).toEqual(first);
  });

  test('history cannot affect the result: stepping through 1, 3, 7 then 10 equals evaluating straight to 10', () => {
    const state = initialState(boat, config);
    const direct = evaluate(state, boat, { config, elapsed: 10 });

    let stepped: ObjectState = state;
    for (const elapsed of [1, 3, 7, 10]) {
      stepped = evaluate(stepped, boat, { config, elapsed });
    }

    expect(stepped).toEqual(direct);
  });
});

describe('routed motion (boat)', () => {
  const boat = TerraObject.make({
    kind: 'boat',
    speed: 0.02,
    source: { lat: 0, lng: 0, height: 0 },
    target: { lat: 0, lng: 60, height: 0 },
    spawnedAt: 0,
  });

  test('is farther along the route at a larger elapsed', () => {
    const state = initialState(boat, config);
    const early = evaluate(state, boat, { config, elapsed: 5 });
    const late = evaluate(state, boat, { config, elapsed: 20 });
    const source = toUnit({ lat: 0, lng: 0 });
    const distanceEarly = Math.acos(
      Math.min(1, Math.max(-1, early.unit[0] * source[0] + early.unit[1] * source[1] + early.unit[2] * source[2])),
    );
    const distanceLate = Math.acos(
      Math.min(1, Math.max(-1, late.unit[0] * source[0] + late.unit[1] * source[1] + late.unit[2] * source[2])),
    );
    expect(distanceLate).toBeGreaterThan(distanceEarly);
  });

  test('clamps at the destination once the route is walked', () => {
    const state = initialState(boat, config);
    const arrived = evaluate(state, boat, { config, elapsed: 100_000 });
    const target = toUnit({ lat: 0, lng: 60 });
    expect(arrived.unit[0]).toBeCloseTo(target[0], 9);
    expect(arrived.unit[1]).toBeCloseTo(target[1], 9);
    expect(arrived.unit[2]).toBeCloseTo(target[2], 9);
  });
});

describe('ObjectState — leg/arrived (feature 1 support)', () => {
  const boat = TerraObject.make({
    kind: 'boat',
    speed: 0.02,
    source: { lat: 0, lng: 0, height: 0 },
    target: { lat: 0, lng: 5, height: 0 },
    spawnedAt: 0,
  });

  test('arrived is false before the route is walked and true once it completes', () => {
    const state = initialState(boat, config);
    const midway = evaluate(state, boat, { config, elapsed: 1 });
    expect(midway.arrived).toBe(false);
    const arrived = evaluate(state, boat, { config, elapsed: 100_000 });
    expect(arrived.arrived).toBe(true);
  });

  test('leg is carried forward unchanged by evaluate — sim/engine.ts alone advances it', () => {
    const state: ObjectState = { ...initialState(boat, config), leg: 3 };
    const result = evaluate(state, boat, { config, elapsed: 5 });
    expect(result.leg).toBe(3);
  });
});

describe('orbit motion (satellite)', () => {
  const satellite = TerraObject.make({
    kind: 'satellite',
    speed: 0,
    orbit: { altitude: 0.1, inclination: 30, phase: 0, period: 60 },
    spawnedAt: 0,
  });

  test('the same elapsed always yields the same position', () => {
    const state = initialState(satellite, config);
    const first = evaluate(state, satellite, { config, elapsed: 23 });
    const second = evaluate(state, satellite, { config, elapsed: 23 });
    expect(second).toEqual(first);
  });

  test('returns to the start after one full period', () => {
    const state = initialState(satellite, config);
    const start = evaluate(state, satellite, { config, elapsed: 0 });
    const afterPeriod = evaluate(state, satellite, { config, elapsed: 60 });
    expect(afterPeriod.unit[0]).toBeCloseTo(start.unit[0], 6);
    expect(afterPeriod.unit[1]).toBeCloseTo(start.unit[1], 6);
    expect(afterPeriod.unit[2]).toBeCloseTo(start.unit[2], 6);
  });

  test('the radius is above the sea surface', () => {
    const state = initialState(satellite, config);
    const result = evaluate(state, satellite, { config, elapsed: 15 });
    expect(result.radius).toBeGreaterThan(seaRadius(config));
  });
});

describe('rocket motion', () => {
  const rocket = TerraObject.make({
    kind: 'rocket',
    speed: 0.02,
    source: { lat: 0, lng: 0, height: 0 },
    target: { lat: 0, lng: 90, height: 0 },
    spawnedAt: 0,
  });

  test('is in boost, then cruise, then descent as elapsed increases', () => {
    const state = initialState(rocket, config);
    const boost = evaluate(state, rocket, { config, elapsed: 5 });
    const cruise = evaluate(state, rocket, { config, elapsed: 40 });
    const descent = evaluate(state, rocket, { config, elapsed: 75 });
    expect(boost.phase).toBe('boost');
    expect(cruise.phase).toBe('cruise');
    expect(descent.phase).toBe('descent');
  });

  test('the apex radius is greater than at launch', () => {
    const state = initialState(rocket, config);
    const atLaunch = evaluate(state, rocket, { config, elapsed: 0 });
    const midFlight = evaluate(state, rocket, { config, elapsed: 39 });
    expect(midFlight.radius).toBeGreaterThan(atLaunch.radius);
  });

  test('ends at the target', () => {
    const state = initialState(rocket, config);
    const arrived = evaluate(state, rocket, { config, elapsed: 100_000 });
    const target = toUnit({ lat: 0, lng: 90 });
    expect(arrived.unit[0]).toBeCloseTo(target[0], 9);
    expect(arrived.unit[1]).toBeCloseTo(target[1], 9);
    expect(arrived.unit[2]).toBeCloseTo(target[2], 9);
  });

  test('starts at ground level — its launch-point terrain surface, not an elevated apex', () => {
    const state = initialState(rocket, config);
    const atLaunch = evaluate(state, rocket, { config, elapsed: 0 });
    const { elevation } = makeSampler(config);
    const groundRadius = Math.max(seaRadius(config), radiusAt(config, elevation(atLaunch.unit)));
    expect(atLaunch.radius).toBeCloseTo(groundRadius, 9);
    expect(atLaunch.flightFraction).toBe(0);
  });

  test('flightFraction rises monotonically from 0 at launch to 1 at touchdown', () => {
    const state = initialState(rocket, config);
    const launch = evaluate(state, rocket, { config, elapsed: 0 });
    const midFlight = evaluate(state, rocket, { config, elapsed: 39 });
    const landed = evaluate(state, rocket, { config, elapsed: 100_000 });
    expect(launch.flightFraction).toBe(0);
    expect(midFlight.flightFraction).toBeGreaterThan(launch.flightFraction);
    expect(midFlight.flightFraction).toBeLessThan(1);
    expect(landed.flightFraction).toBe(1);
  });
});
