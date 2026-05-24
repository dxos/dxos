//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import { type FlyToOptions, type FlyToTarget, type GlobeController } from '../components';

export type { FlyToOptions, FlyToTarget };

/**
 * Returns a `flyTo` callback bound to the given controller. Options are
 * baked in at hook-construction time and forwarded to `controller.flyTo`.
 * The actual animation, distance-scaled duration, and per-instance
 * transition name live on the controller — see `GlobeController.flyTo`.
 */
export const useFlyTo = (controller?: GlobeController | null, options: FlyToOptions = {}) => {
  return useCallback(
    (target: FlyToTarget) => {
      if (!controller) {
        return;
      }
      // Swallow interrupt rejections so callers don't see "transition cancelled"
      // when a new flyTo (or tour) takes over.
      void controller.flyTo(target, options).catch(() => {});
    },
    [controller, JSON.stringify(options)],
  );
};
