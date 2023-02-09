//
// Copyright 2020 DXOS.org
//

import { useMemo, useState, useEffect, useSyncExternalStore, useRef } from 'react';

import { Space } from '@dxos/client';
import { PublicKeyLike } from '@dxos/keys';

import { useClient } from '../client';

/**
 * Get a specific Space via its key. Returns undefined when no spaceKey is
 * available. Requires a ClientProvider somewhere in the parent tree.
 * @returns a Space
 * @param spaceKey the key to look for
 */
export const useSpace = (spaceKey?: PublicKeyLike) => {
  const spaces = useSpaces();
  return spaceKey ? spaces.find((space) => space.key.equals(spaceKey)) : undefined;
};

/**
 * Returns the first space in the current spaces array. If none exists, null
 * will be returned at first, then the hook will re-run and return a space once
 * it has been created. Requires a ClientProvider somewhere in the parent tree.
 * @returns a Space
*/
export const useOrCreateFirstSpace = () => {
  const client = useClient();
  const spaces = useSpaces();
  const [space, setSpace] = useState(spaces?.[0]);
  const isCreatingSpace = useRef(false);
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (!space && !isCreatingSpace.current) {
        isCreatingSpace.current = true;
        try {
          const newSpace = await client.echo.createSpace();
          setSpace(newSpace);
        } catch (err) {
          console.error('Failed to create space');
          console.error(err);
        } finally {
          isCreatingSpace.current = false;
        }
      }
    });
    return () => clearTimeout(timeout);
  }, [space]);
  return space;
};

/**
 * Get all Spaces available to current user.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useSpaces = () => {
  const client = useClient();
  const result = useMemo(() => client.echo.querySpaces(), [client]);
  const spaces: Space[] = useSyncExternalStore(
    (listener) => result.subscribe(listener),
    () => result.value
  );
  return spaces;
};
