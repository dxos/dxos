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
export const useSpace = (spaceKey?: PublicKeyLike) => {
  const { spaces } = useSpaces();
  const space = spaces.find((space) => spaceKey && space.key.equals(spaceKey));

  return { space };
};

/**
 * Get all Spaces available to current user.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useSpaces = () => {
  const client = useClient();
  const result = useMemo(() => client.echo.querySpaces(), [client]);
  const spaces: Space[] = useSyncExternalStore(result.subscribe, () => result.value);

  return { spaces };
};
