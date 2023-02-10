//
// Copyright 2020 DXOS.org
//

import { useMemo, useState, useEffect, useSyncExternalStore, useRef } from 'react';

import { Space } from '@dxos/client';
import { PublicKeyLike } from '@dxos/keys';

import { useClient } from '../client';

/**
 * Get a specific Space using its key. Returns undefined when no spaceKey is
 * available. Requires a ClientProvider somewhere in the parent tree.
 * @returns a Space
 * @param [spaceKey] the key of the space to look for
 */
export const useSpace = (spaceKey?: PublicKeyLike) => {
  const spaces = useSpaces();
  return spaceKey ? spaces.find((space) => space.key.equals(spaceKey)) : undefined;
};

/**
 * Returns the first space in the current spaces array. If none exist, `null`
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
 * Requires a ClientProvider somewhere in the parent tree.
 * @returns an array of Spaces
 */
export const useSpaces = (): Space[] => {
  const client = useClient();
  const spaces = useSyncExternalStore(
    (listener) => client.echo.subscribeSpaces(listener),
    () => client.echo.getSpaces()
  );
  return spaces;
};
