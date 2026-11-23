//
// Copyright 2026 DXOS.org
//

//
// The library an effect imports as `@dxos/plugin-animator/effect`: the definition helper and the math the built-in
// effects share. Pure functions only, since an effect's output must depend on its inputs and seed alone.
//

import { type Vec3, hashSeed, seeded } from '@dxos/animation';

export { hashSeed, seeded };

/** Marks a module's default export as an effect; returns it unchanged. */
export const defineEffect = <T>(effect: T): T => effect;

export const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));

export const lerp = (from: number, to: number, amount: number): number => from + (to - from) * amount;

export const mix = (from: Vec3, to: Vec3, amount: number): Vec3 => ({
  x: lerp(from.x, to.x, amount),
  y: lerp(from.y, to.y, amount),
  z: lerp(from.z, to.z, amount),
});

/** 0 to 1 over `fade` seconds from `elapsed` 0. */
export const ramp = (elapsed: number, fade: number): number =>
  fade <= 0 ? (elapsed >= 0 ? 1 : 0) : clamp(elapsed / fade);

export const easeOutCubic = (amount: number): number => 1 - (1 - clamp(amount)) ** 3;

const distance = (from: Vec3, to: Vec3) => Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);

/** The point `amount` (0 to 1) of the way along a polyline, by length. */
export const along = (points: readonly Vec3[], amount: number): Vec3 => {
  if (points.length === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  if (points.length === 1) {
    return points[0];
  }
  const lengths = points.slice(1).map((point, index) => distance(points[index], point));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  let remaining = clamp(amount) * total;
  for (let index = 0; index < lengths.length; index++) {
    if (remaining <= lengths[index] || index === lengths.length - 1) {
      return mix(points[index], points[index + 1], lengths[index] === 0 ? 0 : clamp(remaining / lengths[index]));
    }
    remaining -= lengths[index];
  }
  return points[points.length - 1];
};
