//
// Copyright 2020 DXOS.org
//

import { useSyncExternalStore } from 'react';

import { useClient } from '../client';

/**
 * Hook returning DXOS identity object.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useIdentity = (options?: { login?: boolean }) => {
  const { login } = { login: false, ...options };
  const client = useClient();
  const identity = useSyncExternalStore(
    (listener) => client.halo.subscribeToProfile(() => listener()),
    () => client.halo.profile
  );
  if (login && !identity) {
    // TODO(wittjosiah): Replace with shell display command.
    // TODO(wittjosiah): Config defaults should be available from the config.
    const remoteSource = new URL(client.config.get('runtime.client.remoteSource') || 'https://halo.dxos.org');

    if (typeof window !== 'undefined') {
      // TODO(wittjosiah): Remove hash.
      const redirect = `#?redirect=${encodeURIComponent(window.location.href)}`;
      window.location.replace(`${remoteSource.origin}${redirect}`);
    }
  }
  return identity;
};
