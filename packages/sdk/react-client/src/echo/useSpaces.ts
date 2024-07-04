//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { type PublicKeyLike } from '@dxos/client';
import { type Space, SpaceState } from '@dxos/client/echo';
import { useMulticastObservable } from '@dxos/react-async';

import { useClient } from '../client';

/**
 * Get a specific Space using its key.
 * The space is not guaranteed to be in the ready state.
 * Returns the default space if no key is provided.
 * Requires a ClientProvider somewhere in the parent tree.
 *
 * @param spaceKeyLike the key of the space to look for
 */
export const useSpace = (spaceKeyLike?: PublicKeyLike): Space | undefined => {
  const client = useClient();
  const spaces = useMulticastObservable<Space[]>(client.spaces);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Only wait for ready if looking for the default space.
    if (spaceKeyLike) {
      return;
    }

    const timeout = setTimeout(async () => {
      await client.spaces.isReady.wait();
      setReady(true);
    });

    return () => clearTimeout(timeout);
  }, [client, spaceKeyLike]);

  if (spaceKeyLike) {
    return spaces.find((space) => space.key.equals(spaceKeyLike) || space.id === spaceKeyLike);
  }

  if (ready && client.halo.identity.get()) {
    return client.spaces.default;
  }
};

export type UseSpacesParams = {
  /**
   * Return uninitialized spaces as well.
   */
  all?: boolean;
};

/**
 * Get all Spaces available to current user.
 * Requires a ClientProvider somewhere in the parent tree.
 * By default, only ready spaces are returned.
 * @returns an array of Spaces
 */
export const useSpaces = ({ all = false }: UseSpacesParams = {}): Space[] => {
  const client = useClient();
  const spaces = useMulticastObservable<Space[]>(client.spaces);

  // TODO(dmaretskyi): Array reference equality.
  return spaces.filter((space) => all || space.state.get() === SpaceState.READY);
};
