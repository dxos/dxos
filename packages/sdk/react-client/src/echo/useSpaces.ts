//
// Copyright 2020 DXOS.org
//

import { useState } from 'react';

import { PublicKey } from '@dxos/client';
import { type Space, type SpaceId, SpaceState } from '@dxos/client/echo';
import { useAsyncEffect, useMulticastObservable } from '@dxos/react-hooks';

import { useClient } from '../client';

/**
 * Get a specific Space using its id.
 * The space is not guaranteed to be in the ready state.
 * Returns the default space if no id is provided.
 * Requires a ClientProvider somewhere in the parent tree.
 *
 * @param spaceId the id of the space to look for
 */
// TODO(wittjosiah): Currently unable to remove `PublicKey` from this api.
//  When initially joining a space that is all that is returned.
export const useSpace = (spaceId?: SpaceId | PublicKey): Space | undefined => {
  const client = useClient();
  const spaces = useMulticastObservable<Space[]>(client.spaces);
  const [ready, setReady] = useState(false);

  useAsyncEffect(async () => {
    // Only wait for ready if looking for the default space.
    if (spaceId) {
      return;
    }

    await client.spaces.waitUntilReady();
    setReady(true);
  }, [client, spaceId]);

  if (spaceId) {
    return spaces.find((space) => {
      if (spaceId instanceof PublicKey) {
        return space.key.equals(spaceId);
      }

      return space.id === spaceId;
    });
  }

  if (ready && client.halo.identity.get()) {
    return client.spaces.default;
  }
};

/**
 * Get a Space database by the id of the space.
 * The space is not guaranteed to be in the ready state.
 * Returns the default space if no id is provided.
 * Requires a ClientProvider somewhere in the parent tree.
 *
 * @param spaceId the id of the space to look for
 */
export const useDatabase = (spaceId?: SpaceId): Space['db'] | undefined => {
  const space = useSpace(spaceId);
  return space?.db;
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
  return spaces.filter((space) => all || space.state.get() === SpaceState.SPACE_READY);
};
