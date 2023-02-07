//
// Copyright 2023 DXOS.org
//
import { useEffect, useState } from 'react';

import { useIdentity, useClient, useSpaces, useSpace } from '@dxos/react-client';

export const useDefaultIdentity = () => {
  const client = useClient();
  const identity = useIdentity();
  // TODO(wittjosiah): Separate config for HALO UI & vault so origin doesn't need to parsed out.
  // TODO(wittjosiah): Config defaults should be available from the config.
  const remoteSource = new URL(client.config.get('runtime.client.remoteSource') || 'https://halo.dxos.org');

  if (!identity && typeof window !== 'undefined') {
    // TODO(wittjosiah): Remove hash.
    const redirect = `#?redirect=${encodeURIComponent(window.location.href)}`;
    window.location.replace(`${remoteSource.origin}${redirect}`);
  }

  return identity;
};

export const useDefaultSpace = () => {
  const spaces = useSpaces();
  const client = useClient();
  const [space, setSpace] = useState(spaces?.[0]);
  useEffect(() => {
    if (!space) {
      client.echo
        .createSpace()
        .then(setSpace)
        .catch((err) => console.error(err));
    }
  }, [space]);
  return space;
};
