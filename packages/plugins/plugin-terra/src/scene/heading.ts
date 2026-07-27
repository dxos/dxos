//
// Copyright 2026 DXOS.org
//

import { turnToward } from '../sim/geo';

/**
 * Max degrees a rendered heading may turn per real second. A route corner eases out within well
 * under a second at this rate, which reads as banking rather than snapping, without lagging visibly
 * behind the sim's actual course.
 */
export const MAX_TURN_RATE_DEG_PER_SEC = 240;

/**
 * The next eased heading toward `target`, given the previous frame's rendered heading and the real
 * (wall-clock) time since that frame. Rendering-only: never feeds back into `sim/` position or
 * bearing, so peers rendering at different frame cadences still agree on where every object is.
 * `current === undefined` (an object's first frame) snaps straight to `target` so nothing spins up
 * from a default facing.
 */
export const easeHeading = (current: number | undefined, target: number, deltaMs: number): number => {
  if (current === undefined) {
    return target;
  }
  const maxDelta = MAX_TURN_RATE_DEG_PER_SEC * (Math.max(0, deltaMs) / 1000);
  return turnToward(current, target, maxDelta);
};
