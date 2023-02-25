//
// Copyright 2020 DXOS.org
//

import { useEffect, useSyncExternalStore, useRef } from 'react';

import { Space } from '@dxos/client';
import { PublicKeyLike } from '@dxos/keys';

import { useClient } from '../client';

/**
 * Get a specific Space via its key.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useSpace = (spaceKey?: PublicKeyLike | null, options?: { create?: boolean }) => {
  const { create } = { create: false, ...options };
  const client = useClient();
  const spaces = useSpaces();
  const space = spaceKey ? spaces.find((space) => spaceKey && space.key.equals(spaceKey)) : spaces?.[0];
  const creating = useRef(false);
  useEffect(() => {
    if (!space && create && !creating.current) {
      creating.current = true;
      client.echo
        .createSpace()
        .then(() => (creating.current = false))
        .catch((err) => {
          console.error(err); // TODO(burdon): Log.
          creating.current = false;
        });
    }
  }, [space]);

  return space;
};

/**
 * Get all Spaces available to current user.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useSpaces = (): Space[] => {
  const client = useClient();
  const spaces = useSyncExternalStore(
    (listener) => client.echo.subscribeSpaces(listener),
    () => client.echo.getSpaces()
  );

  return spaces;
};
