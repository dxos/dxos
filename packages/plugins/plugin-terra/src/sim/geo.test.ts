//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import {
  advance,
  angleBetween,
  bearingOfTangent,
  bearingTo,
  geodesicTangent,
  tangentFrame,
  toGeo,
  toUnit,
  turnToward,
} from './geo.ts';

describe('geo', () => {
  test('toUnit places the poles and the prime meridian', () => {
    expect(toUnit({ lat: 90, lng: 0 })[1]).toBeCloseTo(1, 9);
    expect(toUnit({ lat: -90, lng: 0 })[1]).toBeCloseTo(-1, 9);
    const equator = toUnit({ lat: 0, lng: 0 });
    expect(equator[2]).toBeCloseTo(1, 9); // Prime meridian faces +z.
  });

  test('toGeo round-trips toUnit', () => {
    for (const point of [
      { lat: 12.5, lng: 42 },
      { lat: -33, lng: -120 },
      { lat: 0, lng: 179 },
    ]) {
      const back = toGeo(toUnit(point));
      expect(back.lat).toBeCloseTo(point.lat, 6);
      expect(back.lng).toBeCloseTo(point.lng, 6);
    }
  });

  test('tangent frame is orthonormal and points north', () => {
    const unit = toUnit({ lat: 20, lng: 55 });
    const { north, east } = tangentFrame(unit);
    expect(north[0] * unit[0] + north[1] * unit[1] + north[2] * unit[2]).toBeCloseTo(0, 9);
    expect(east[0] * unit[0] + east[1] * unit[1] + east[2] * unit[2]).toBeCloseTo(0, 9);
    expect(north[0] * east[0] + north[1] * east[1] + north[2] * east[2]).toBeCloseTo(0, 9);
    expect(north[1]).toBeGreaterThan(0); // North has a positive y component off the pole.
  });

  test('bearingTo reports cardinal directions', () => {
    const origin = toUnit({ lat: 0, lng: 0 });
    expect(bearingTo(origin, toUnit({ lat: 10, lng: 0 }))).toBeCloseTo(0, 4);
    expect(bearingTo(origin, toUnit({ lat: 0, lng: 10 }))).toBeCloseTo(90, 4);
    expect(bearingTo(origin, toUnit({ lat: -10, lng: 0 }))).toBeCloseTo(180, 4);
    expect(bearingTo(origin, toUnit({ lat: 0, lng: -10 }))).toBeCloseTo(270, 4);
  });

  test('advance moves along the great circle by the given angle', () => {
    const origin = toUnit({ lat: 0, lng: 0 });
    const moved = advance(origin, 90, Math.PI / 18); // 10 degrees east.
    const geo = toGeo(moved);
    expect(geo.lat).toBeCloseTo(0, 6);
    expect(geo.lng).toBeCloseTo(10, 6);
    expect(angleBetween(origin, moved)).toBeCloseTo(Math.PI / 18, 9);
  });

  test('advance stays on the unit sphere', () => {
    const moved = advance(toUnit({ lat: 45, lng: 30 }), 217, 0.4);
    expect(Math.hypot(moved[0], moved[1], moved[2])).toBeCloseTo(1, 9);
  });

  test('geodesicTangent at fraction 0 agrees with bearingTo(from, to)', () => {
    const from = toUnit({ lat: 5, lng: 15 });
    const to = toUnit({ lat: 40, lng: 65 });
    const bearing = bearingOfTangent(from, geodesicTangent(from, to, 0));
    expect(bearing).toBeCloseTo(bearingTo(from, to), 9);
  });

  test('geodesicTangent is degenerate (zero) when from and to coincide', () => {
    const point = toUnit({ lat: 12, lng: 34 });
    const tangent = geodesicTangent(point, point, 0.5);
    expect(tangent).toEqual([0, 0, 0]);
  });

  test('turnToward takes the short way around the wrap', () => {
    expect(turnToward(350, 10, 30)).toBeCloseTo(10, 9); // Crosses 360 forward.
    expect(turnToward(10, 350, 30)).toBeCloseTo(350, 9); // Crosses 0 backward.
    expect(turnToward(0, 90, 30)).toBeCloseTo(30, 9); // Clamped by maxDelta.
    expect(turnToward(0, 270, 30)).toBeCloseTo(330, 9); // Shorter to turn left.
  });
});
