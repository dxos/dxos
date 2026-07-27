//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type Vec3 } from '../engine';
import { type Trail, type TrailSpec, activePuffs, createTrail, emit } from './trail';

const SPEC: TrailSpec = { spacing: 1, lifetimeMs: 1000, capacity: 5, startRadius: 0.01, endScale: 2, startAlpha: 0.3 };

/** A straight line along +x, one unit apart, so successive points cross `SPEC.spacing` exactly. */
const pointAlongX = (index: number): Vec3 => [index, 0, 0];

describe('trail', () => {
  test('emit adds nothing until the object has moved at least spacing', () => {
    const trail = emit(createTrail(SPEC.capacity), pointAlongX(0), 0, SPEC);
    const unchanged = emit(trail, [0.4, 0, 0], 10, SPEC);
    expect(unchanged.count).toBe(1);
    expect(unchanged.lastEmit).toEqual(pointAlongX(0));
  });

  test('emit adds once the object has moved past spacing, and updates lastEmit', () => {
    const first = emit(createTrail(SPEC.capacity), pointAlongX(0), 0, SPEC);
    const second = emit(first, pointAlongX(1), 10, SPEC);
    expect(second.count).toBe(2);
    expect(second.lastEmit).toEqual(pointAlongX(1));
  });

  test('the ring buffer never exceeds capacity and overwrites oldest-first', () => {
    let trail = createTrail(SPEC.capacity);
    const total = SPEC.capacity + 5;
    for (let index = 0; index < total; index++) {
      trail = emit(trail, pointAlongX(index), index * 10, SPEC);
    }

    const puffs = activePuffs(trail, total * 10, SPEC);
    expect(puffs).toHaveLength(SPEC.capacity);

    // The earliest emissions (index 0..4) were overwritten; only the last `capacity` remain.
    const positions = puffs.map((puff) => puff.position[0]);
    expect(Math.min(...positions)).toBe(total - SPEC.capacity);
    expect(Math.max(...positions)).toBe(total - 1);
  });

  test('activePuffs omits expired puffs and reports age increasing toward 1', () => {
    let trail = createTrail(SPEC.capacity);
    trail = emit(trail, pointAlongX(0), 0, SPEC);
    trail = emit(trail, pointAlongX(1), 100, SPEC);

    // Puffs are reported oldest first; the older puff (born at 0) has a larger normalized age
    // than the younger one (born at 100) at the same instant.
    const midway = activePuffs(trail, 500, SPEC);
    expect(midway).toHaveLength(2);
    expect(midway[0].age).toBeGreaterThan(midway[1].age);
    expect(midway[1].age).toBeGreaterThan(0);
    expect(midway[0].age).toBeLessThanOrEqual(1);

    // The first puff (born at 0) has since expired at nowMs = 1050 (lifetimeMs = 1000); the second
    // (born at 100) is still alive, at age (1050 - 100) / 1000 = 0.95.
    const afterExpiry = activePuffs(trail, 1050, SPEC);
    expect(afterExpiry).toHaveLength(1);
    expect(afterExpiry[0].position).toEqual(pointAlongX(1));
    expect(afterExpiry[0].age).toBeCloseTo(0.95, 9);
  });

  test('determinism: the same position/time sequence produces identical puff arrays', () => {
    const sequence: Array<{ position: Vec3; nowMs: number }> = [
      { position: pointAlongX(0), nowMs: 0 },
      { position: pointAlongX(1), nowMs: 50 },
      { position: pointAlongX(2), nowMs: 120 },
      { position: pointAlongX(3), nowMs: 260 },
    ];

    const run = (): Trail =>
      sequence.reduce((trail, step) => emit(trail, step.position, step.nowMs, SPEC), createTrail(SPEC.capacity));

    const first = activePuffs(run(), 300, SPEC);
    const second = activePuffs(run(), 300, SPEC);
    expect(first).toEqual(second);
  });
});
