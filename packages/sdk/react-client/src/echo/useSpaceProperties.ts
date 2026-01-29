//
// Copyright 2025 DXOS.org
//

import { MulticastObservable } from '@dxos/async';
import { type SpaceProperties, SpaceState } from '@dxos/client/echo';
import { type Key, Obj } from '@dxos/echo';
import { type ObjectUpdateCallback, useObject } from '@dxos/echo-react';
import { useMulticastObservable } from '@dxos/react-hooks';

import { useSpace } from './useSpaces';

/**
 * Subscribe to a space's properties with reactive updates.
 * Returns undefined if the space is undefined or not ready yet.
 * Automatically waits for the space to be ready before returning properties.
 *
 * @param spaceId - The space ID to get properties from (can be undefined).
 * @returns A tuple of [snapshot, updateCallback] or [undefined, no-op] if not ready.
 */
export const useSpaceProperties = (
  spaceId: Key.SpaceId | undefined,
): [Obj.Snapshot<SpaceProperties> | undefined, ObjectUpdateCallback<SpaceProperties>] => {
  const space = useSpace(spaceId);
  const spaceState = useMulticastObservable(space?.state ?? MulticastObservable.empty());
  const properties = spaceState === SpaceState.SPACE_READY ? space?.properties : undefined;
  return useObject(properties);
};
