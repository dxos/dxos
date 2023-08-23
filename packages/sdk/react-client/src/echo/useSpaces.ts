//
// Copyright 2020 DXOS.org
//

import { PublicKeyLike } from '@dxos/client';
import { type Space, SpaceState, defaultKey } from '@dxos/client/echo';
import { useMulticastObservable } from '@dxos/react-async';

import { useClient } from '../client';

/**
 * Get a specific Space using its key. Returns undefined when no spaceKey is
 * available. Requires a ClientProvider somewhere in the parent tree.
 * @returns a Space
 * @param [spaceKey] the key of the space to look for
 */
export const useSpace = (spaceKey?: PublicKeyLike) => {
  const spaces = useSpaces();
  return spaceKey
    ? spaces.find((space) => space.key.equals(spaceKey))
    : spaces.find((space) => space.properties[defaultKey]);
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
  const spaces = useMulticastObservable(client.spaces);

  // TODO(dmaretskyi): Array reference equality.
  return spaces.filter((space) => all || space.state.get() === SpaceState.READY);
};
