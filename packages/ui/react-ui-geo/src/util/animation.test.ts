//
// Copyright 2026 DXOS.org
//

import { geoOrthographic } from 'd3';
import { describe, expect, test } from 'vitest';

import { type Vector } from '../hooks/index.ts';
import { createAxisRotationTween } from './animation.ts';

describe('createAxisRotationTween', () => {
  const run = (from: Vector, to: Vector) => {
    const rotations: Vector[] = [];
    const tween = createAxisRotationTween(geoOrthographic(), (rotation) => rotations.push(rotation), from, to);
    tween(0.5);
    tween(1);
    return rotations;
  };

  test('turns the shorter way round the axis', () => {
    // 170° to -170° is 20° east across the antimeridian, not 340° west.
    // d3 leaves the angle unnormalised, so compare modulo a full turn.
    const turn = (angle: number) => ((angle % 360) + 360) % 360;
    const [half, end] = run([170, 0, 0], [-170, 0, 0]);
    expect(turn(half[0])).toBeCloseTo(180);
    expect(turn(end[0])).toBeCloseTo(190);
  });

  test('keeps the poles upright while tilting', () => {
    const [half, end] = run([0, 0, 0], [90, -40, 0]);
    expect(half).toEqual([45, -20, 0].map((value) => expect.closeTo(value)));
    expect(end[1]).toBeCloseTo(-40);
    expect(end[2]).toBeCloseTo(0);
  });
});
