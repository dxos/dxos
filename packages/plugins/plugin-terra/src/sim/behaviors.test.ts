//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Terra, TerraObject } from '#types';

import { type Vec3, makeSampler, radiusAt, seaRadius } from '../engine/index.ts';
import { CRUISE_ALTITUDE, behaviorFor } from './behaviors.ts';
import { angleBetween, slerp, toUnit } from './geo.ts';
import { buildNavGrid } from './nav-grid.ts';
import { walkRoute } from './path.ts';

const config = Terra.toConfigValues(Terra.make({ config: { seed: 'behaviors-1' } }));
const sea = seaRadius(config);
const cruise = sea * (1 + CRUISE_ALTITUDE);

const plane = TerraObject.make({ kind: 'plane', speed: 0.03, spawnedAt: 0 });

/** The attitude a plane holds `distance` along `route`. */
const planeAt = (route: readonly Vec3[], distance: number) =>
  behaviorFor('plane').attitude({
    definition: plane,
    config,
    unit: walkRoute(route, distance).unit,
    route,
    distance,
    flightFraction: 0,
  });

/**
 * A route that flies over the seed's highest terrain: from a point a quarter turn before the peak,
 * through it, to a quarter turn beyond, so the flight has open ground on both sides of the climb.
 */
const routeOverPeak = (): { route: Vec3[]; peakDistance: number } => {
  const grid = buildNavGrid(config, 24);
  const peak = grid.cells.reduce((highest, cell) => (cell.elevation > highest.elevation ? cell : highest));
  // Two points either side of the peak on the great circle through it and the north pole.
  const pole: Vec3 = [0, 1, 0];
  const before = slerp(peak.unit, pole, 0.35);
  const after = slerp(peak.unit, pole, -0.35);
  const route = [before, peak.unit, after];
  return { route, peakDistance: angleBetween(before, peak.unit) };
};

describe('plane behavior', () => {
  test('holds cruise altitude with nothing ahead of it', ({ expect }) => {
    // A leg out over open ocean: the sampler's elevation there is below sea level for the whole
    // lookahead window, so nothing lifts the plane off cruise.
    const grid = buildNavGrid(config, 24);
    const deep = grid.cells.reduce((lowest, cell) => (cell.elevation < lowest.elevation ? cell : lowest));
    const route = [deep.unit, slerp(deep.unit, [0, 1, 0], 0.05)];
    const { radius, pitch } = planeAt(route, 0);
    expect(radius).toBeCloseTo(cruise, 6);
    expect(pitch).toBe(0);
  });

  test('climbs above the terrain it is flying toward, and clears it', ({ expect }) => {
    const { route, peakDistance } = routeOverPeak();
    const { elevation } = makeSampler(config);
    const peakRadius = radiusAt(config, elevation(route[1]));

    const overPeak = planeAt(route, peakDistance);
    expect(overPeak.radius).toBeGreaterThan(peakRadius);
    expect(overPeak.radius).toBeGreaterThan(cruise);
  });

  test('noses up on the way in and back down on the way out', ({ expect }) => {
    const { route, peakDistance } = routeOverPeak();
    // Far enough back that the peak is still outside the lookahead window at the first sample.
    const approach = planeAt(route, peakDistance - 0.05);
    const departure = planeAt(route, peakDistance + 0.05);
    expect(approach.pitch).toBeGreaterThan(0);
    expect(departure.pitch).toBeLessThan(0);
  });

  test('begins climbing before it reaches the terrain', ({ expect }) => {
    const { route, peakDistance } = routeOverPeak();
    const approaching = planeAt(route, peakDistance - 0.04);
    expect(approaching.radius).toBeGreaterThan(cruise);
    expect(approaching.radius).toBeLessThan(planeAt(route, peakDistance).radius);
  });

  test('holds one climb and one descent across a peak, without the nose jittering', ({ expect }) => {
    const { route, peakDistance } = routeOverPeak();
    const step = 0.001;
    // Sampled far finer than the terrain samples themselves, which is what exposed the first
    // attempt at this: a pointwise slope over a window of discrete samples read terrain roughness
    // as course changes, flipping the nose between its limits several times per second.
    let reversals = 0;
    let sharpest = 0;
    let previous = planeAt(route, 0).pitch;
    for (let distance = step; distance <= peakDistance * 2; distance += step) {
      const { pitch } = planeAt(route, distance);
      if (pitch !== 0 && previous !== 0 && Math.sign(pitch) !== Math.sign(previous)) {
        reversals++;
      }
      sharpest = Math.max(sharpest, Math.abs(pitch - previous));
      previous = pitch;
    }

    // One peak means at most one crossing from climbing to descending.
    expect(reversals).toBeLessThanOrEqual(1);
    expect(sharpest).toBeLessThan((10 * Math.PI) / 180);
  });

  test('never pitches past its limit', ({ expect }) => {
    const { route, peakDistance } = routeOverPeak();
    for (let step = 0; step <= 40; step++) {
      const { pitch } = planeAt(route, (peakDistance * 2 * step) / 40);
      expect(Math.abs(pitch)).toBeLessThanOrEqual((25 * Math.PI) / 180 + 1e-9);
    }
  });

  test('returns to cruise once the terrain is behind it', ({ expect }) => {
    const { route, peakDistance } = routeOverPeak();
    // A full lookahead window past the peak, with the route's remaining leg over lower ground.
    const settled = planeAt(route, peakDistance + 0.25);
    expect(settled.radius).toBeLessThan(planeAt(route, peakDistance).radius);
  });
});

describe('other behaviors', () => {
  const at = (kind: TerraObject.Kind, unit: Vec3, flightFraction = 0) =>
    behaviorFor(kind).attitude({
      definition: TerraObject.make({ kind, speed: 0.01, spawnedAt: 0 }),
      config,
      unit,
      route: [unit],
      distance: 0,
      flightFraction,
    });

  test('a boat sits at sea level, level', ({ expect }) => {
    const { radius, pitch } = at('boat', toUnit({ lat: 0, lng: 0 }));
    expect(radius).toBe(sea);
    expect(pitch).toBe(0);
  });

  test('a tank follows the terrain, level', ({ expect }) => {
    const unit = toUnit({ lat: 20, lng: 40 });
    const { elevation } = makeSampler(config);
    const { radius, pitch } = at('tank', unit);
    expect(radius).toBe(Math.max(sea, radiusAt(config, elevation(unit))));
    expect(pitch).toBe(0);
  });

  test('a rocket noses up at launch, over at apex, and down at touchdown', ({ expect }) => {
    const source = toUnit({ lat: 0, lng: 0 });
    const target = toUnit({ lat: 0, lng: 60 });
    const arc = (flightFraction: number) =>
      behaviorFor('rocket').attitude({
        definition: TerraObject.make({ kind: 'rocket', speed: 0.05, spawnedAt: 0 }),
        config,
        unit: slerp(source, target, flightFraction),
        route: [source, target],
        distance: 0,
        flightFraction,
      });

    expect(arc(0).pitch).toBeGreaterThan(0);
    expect(arc(0.5).pitch).toBeCloseTo(0, 6);
    expect(arc(1).pitch).toBeLessThan(0);
    // As steep coming down as going up, give or take the ground clamp: the two ends of the arc sit
    // on different terrain, and the angle is measured against each end's own radius.
    expect(arc(0).pitch).toBeCloseTo(-arc(1).pitch, 2);
    // Its arc peaks at apex and returns to the surface at either end.
    expect(arc(0.5).radius).toBeGreaterThan(arc(0).radius);
  });
});
