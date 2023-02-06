//
// Copyright 2020 DXOS.org
//

import { useMemo, useSyncExternalStore } from 'react';

import { Space } from '@dxos/client';
import { PublicKeyLike } from '@dxos/keys';

import { useClient } from '../client';

/**
 * Get a specific Space via its key.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useSpace = (spaceKey?: PublicKeyLike): Space | undefined => {
  const spaces = useSpaces();
  return spaces.find((space) => spaceKey && space.key.equals(spaceKey));
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
