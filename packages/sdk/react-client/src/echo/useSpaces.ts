//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { Space } from '@dxos/client';
import { PublicKeyLike } from '@dxos/keys';

import { useClient } from '../client';

/**
 * Get a specific Space.
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
  const [spaces, setSpaces] = useState<Space[]>([]);

  useEffect(() => {
    const result = client.echo.querySpaces();
    setSpaces(result.value);

    const unsubscribe = result.subscribe(() => {
      setSpaces(result.value);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return spaces;
};
