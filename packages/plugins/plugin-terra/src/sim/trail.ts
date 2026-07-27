//
// Copyright 2026 DXOS.org
//

import { type Vec3, sub } from '../engine';
import { type TerraObject } from '../types';

/** A single trail marker: where it was emitted, and when. */
export type Puff = { position: Vec3; bornAt: number };

/**
 * A fixed-capacity ring buffer of puffs. `head` is the next write slot; `count` is how many slots
 * currently hold a live puff (saturates at `puffs.length`). `lastEmit` is the position at which the
 * most recent puff was appended, so `emit` can gate on distance without scanning the buffer.
 */
export type Trail = { puffs: Puff[]; head: number; count: number; lastEmit: Vec3 | undefined };

/** Per-kind tuning: emission spacing, puff lifetime, ring-buffer capacity, and render-side sizing/alpha. */
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

/** A fresh, empty trail with room for `capacity` live puffs. */
export const createTrail = (capacity: number): Trail => ({
  puffs: new Array<Puff>(capacity),
  head: 0,
  count: 0,
  lastEmit: undefined,
});

/** Squared Euclidean distance between two points, avoiding a square root at the `emit` gate. */
const distanceSquared = (a: Vec3, b: Vec3): number => {
  const delta = sub(a, b);
  return delta[0] * delta[0] + delta[1] * delta[1] + delta[2] * delta[2];
};

/**
 * Appends a puff at `position` only once the object has moved at least `spec.spacing` from the
 * last emission point — distance-based, not time-based, so a faster object leaves a longer trail
 * rather than a denser one. Returns `trail` unchanged (same reference) when the gate is not met.
 */
export const emit = (trail: Trail, position: Vec3, nowMs: number, spec: TrailSpec): Trail => {
  if (trail.lastEmit && distanceSquared(position, trail.lastEmit) < spec.spacing * spec.spacing) {
    return trail;
  }

  const capacity = trail.puffs.length;
  const puffs = trail.puffs.slice();
  puffs[trail.head] = { position, bornAt: nowMs };

  return {
    puffs,
    head: (trail.head + 1) % capacity,
    count: Math.min(trail.count + 1, capacity),
    lastEmit: position,
  };
};

/** Live puffs, oldest first, younger than `spec.lifetimeMs`, with `age` normalized to `[0, 1]`. */
export const activePuffs = (trail: Trail, nowMs: number, spec: TrailSpec): { position: Vec3; age: number }[] => {
  const capacity = trail.puffs.length;
  const oldestIndex = (trail.head - trail.count + capacity) % capacity;

  const result: { position: Vec3; age: number }[] = [];
  for (let offset = 0; offset < trail.count; offset++) {
    const puff = trail.puffs[(oldestIndex + offset) % capacity];
    const elapsed = nowMs - puff.bornAt;
    if (elapsed >= 0 && elapsed < spec.lifetimeMs) {
      result.push({ position: puff.position, age: Math.min(1, Math.max(0, elapsed / spec.lifetimeMs)) });
    }
  }
  return result;
};
