//
// Copyright 2026 DXOS.org
//

import { turnToward } from '../sim';
import { type TerraObject } from '../types';

/**
 * Max degrees a rendered heading may turn per real second, per kind — a heavy hull turning this
 * fast would look like it snapped rather than steered, so ground/sea/air vehicles that actually
 * corner at waypoints get a rate a real vehicle could pull off. Satellites never corner (their
 * bearing drifts smoothly and continuously along the orbit tangent — see `motion.ts`'s
 * `evaluateOrbit`), so a high rate here costs nothing and keeps their render heading from ever
 * visibly lagging the sim.
 */
export const MAX_TURN_RATE_DEG_PER_SEC: Record<TerraObject.Kind, number> = {
  boat: 45,
  tank: 90,
  plane: 60,
  rocket: 90,
  satellite: 180,
};

/**
 * The next eased heading toward `target`, given the previous frame's rendered heading, the real
 * (wall-clock) time since that frame, and `kind`'s own max turn rate. Rendering-only: never feeds
 * back into `sim/` position or bearing, so peers rendering at different frame cadences still agree
 * on where every object is. `current === undefined` (an object's first frame) snaps straight to
 * `target` so nothing spins up from a default facing.
 */
export const easeHeading = (
  current: number | undefined,
  target: number,
  deltaMs: number,
  kind: TerraObject.Kind,
): number => {
  if (current === undefined) {
    return target;
  }
  const maxDelta = MAX_TURN_RATE_DEG_PER_SEC[kind] * (Math.max(0, deltaMs) / 1000);
  return turnToward(current, target, maxDelta);
};
