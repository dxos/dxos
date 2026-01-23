//
// Copyright 2025 DXOS.org
//

import { useSyncExternalStore } from 'react';

import { type Space, type SpaceProperties, SpaceState } from '@dxos/client/echo';
import { type ObjectUpdateCallback, useObject } from '@dxos/echo-react';

/**
 * Subscribe to a space's properties with reactive updates.
 * Returns undefined if the space is undefined or not ready yet.
 * Automatically waits for the space to be ready before returning properties.
 *
 * @param space - The space to get properties from (can be undefined).
 * @returns A tuple of [snapshot, updateCallback] or [undefined, no-op] if not ready.
 */
export const useSpaceProperties = (
  space: Space | undefined,
): [Readonly<SpaceProperties> | undefined, ObjectUpdateCallback<SpaceProperties>] => {
  const spaceState = useSyncExternalStore(
    (listener) => {
      if (!space) {
        return () => {};
      }
      const subscription = space.state.subscribe(listener);
      return () => subscription.unsubscribe();
    },
    () => space?.state.get(),
  );

  const properties = spaceState === SpaceState.SPACE_READY ? space?.properties : undefined;

  // Subscribe to the properties object for reactive updates.
  const [snapshot, updateCallback] = useObject(properties);

  return [snapshot, updateCallback];
};
