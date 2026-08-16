//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { stepVelocity } from './follow';

const maxSpeed = 1_600;
const acceleration = 3_200;
const frame = 1 / 60;

const step = (velocity: number, distance: number) =>
  stepVelocity({ velocity, distance, dt: frame, maxSpeed, acceleration });

describe('stepVelocity', () => {
  test('ramps up from rest rather than jumping to full speed', () => {
    const first = step(0, 10_000);
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(maxSpeed / 2);
  });

  test('reaches the ceiling and stays there while the target is far', () => {
    let velocity = 0;
    for (let index = 0; index < 120; index++) {
      velocity = step(velocity, 10_000);
    }
    expect(velocity).toEqual(maxSpeed);
  });

  test('decelerates as the target approaches', () => {
    const near = step(maxSpeed, 20);
    expect(near).toBeLessThan(maxSpeed);
    expect(step(near, 5)).toBeLessThan(near);
  });

  test('arrives at rest', () => {
    expect(step(0, 0)).toEqual(0);
  });

  test('a whole travel accelerates, cruises and lands gently', () => {
    // Simulated rather than asserted step-by-step: deceleration is rate-limited like acceleration,
    // so a single step from an arbitrary speed can exceed its own braking distance. What matters is
    // the shape of the complete journey.
    let velocity = 0;
    let position = 0;
    const target = 4_000;
    const speeds: number[] = [];
    for (let index = 0; index < 600 && target - position > 0.5; index++) {
      velocity = step(velocity, target - position);
      position = Math.min(target, position + velocity * frame);
      speeds.push(velocity);
    }

    expect(position).toBeCloseTo(target, 0);
    expect(Math.max(...speeds)).toBeLessThanOrEqual(maxSpeed);
    // Reached the ceiling in the middle, and shed most of it by the end.
    expect(Math.max(...speeds)).toBeGreaterThan(maxSpeed * 0.9);
    expect(speeds[speeds.length - 1]).toBeLessThan(maxSpeed / 4);
  });

  test('a moving target keeps it at cruise speed', () => {
    // Content arriving faster than the follow travels: the distance never shrinks.
    let velocity = 0;
    for (let index = 0; index < 120; index++) {
      velocity = step(velocity, 5_000);
    }
    expect(velocity).toEqual(maxSpeed);
  });
});
