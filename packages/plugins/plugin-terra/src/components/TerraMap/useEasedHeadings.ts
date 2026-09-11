//
// Copyright 2026 DXOS.org
//

import { useRef } from 'react';

// Imported from the module rather than the `scene` barrel, which would pull Babylon into this view.
import { easeHeading } from '../../scene/heading.ts';
import { type SimObject } from '../../sim/index.ts';

/**
 * Per-object headings eased toward the simulated bearing at each object kind's own turn rate — the
 * same treatment `ObjectLayer` gives the 3D meshes, so a course change (a new destination, a
 * waypoint) is steered into rather than snapped to. Rendering-only: nothing here feeds back into
 * `sim/`, so it cannot affect where an object is, only which way it is drawn facing.
 */
export const useEasedHeadings = (objects: readonly SimObject[]): Map<string, number> => {
  const headings = useRef(new Map<string, number>());
  const sampledAt = useRef<number | null>(null);

  const now = performance.now();
  const deltaMs = sampledAt.current === null ? 0 : now - sampledAt.current;
  sampledAt.current = now;

  const live = new Set<string>();
  for (const { definition, state } of objects) {
    live.add(definition.id);
    headings.current.set(
      definition.id,
      easeHeading(headings.current.get(definition.id), state.bearing, deltaMs, definition.kind),
    );
  }

  // Forget objects that have gone, so a re-added id starts facing where it is pointed rather than
  // turning from wherever its predecessor left off.
  for (const id of headings.current.keys()) {
    if (!live.has(id)) {
      headings.current.delete(id);
    }
  }

  return headings.current;
};
