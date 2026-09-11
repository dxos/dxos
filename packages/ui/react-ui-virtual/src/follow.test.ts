//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { stepVelocity } from './follow.ts';

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

  test('brakes onto the curve rather than easing towards it', () => {
    // Rate-limiting the slow-down would leave the speed above what the remaining distance can shed,
    // and the follow would reach the target still moving — an abrupt stop instead of a landing.
    for (const distance of [1, 10, 100, 400]) {
      const velocity = step(maxSpeed, distance);
      expect((velocity * velocity) / (2 * acceleration)).toBeLessThanOrEqual(distance + 1e-6);
    }
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
    const steps: number[] = [];
    for (let index = 0; index < 600 && target - position > 0.5; index++) {
      velocity = step(velocity, target - position);
      const next = Math.min(target, position + velocity * frame);
      steps.push(next - position);
      position = next;
      speeds.push(velocity);
    }

    expect(position).toBeCloseTo(target, 0);
    expect(Math.max(...speeds)).toBeLessThanOrEqual(maxSpeed);
    expect(Math.max(...speeds)).toBeGreaterThan(maxSpeed * 0.9);
    // Landing measured in pixels travelled, not as a fraction of the ceiling: the last frame before
    // arrival is what the eye reads as a glide or a stop, and a couple of pixels is a glide.
    expect(steps[steps.length - 1]).toBeLessThan(4);
    expect(steps[0]).toBeLessThan(steps[Math.floor(steps.length / 2)]);
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

describe('deceleration', () => {
  const at = (distance: number, deceleration: number) =>
    stepVelocity({ velocity: maxSpeed, distance, dt: frame, maxSpeed, acceleration, deceleration });

  test('a gentler rate starts braking further out', () => {
    // Braking distance is v²/2d: at a third of the rate the follow is already slowing where the
    // matched rate is still at full speed, which is what makes the landing visible.
    // 800px is inside the gentler rate's runway (v²/2d = 1200px) and outside the matched one's
    // (400px), so the two disagree exactly where it matters.
    const distance = 800;
    expect(at(distance, acceleration)).toEqual(maxSpeed);
    expect(at(distance, acceleration / 3)).toBeLessThan(maxSpeed);
  });

  test('defaults to the acceleration when unset', () => {
    expect(stepVelocity({ velocity: maxSpeed, distance: 100, dt: frame, maxSpeed, acceleration })).toEqual(
      at(100, acceleration),
    );
  });
});
