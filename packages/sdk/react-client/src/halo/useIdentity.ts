//
// Copyright 2020 DXOS.org
//

import { useSyncExternalStore } from 'react';

import { useClient } from '../client';

/**
 * Hook returning DXOS identity object.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useIdentity = () => {
  const client = useClient();
  const identity = useSyncExternalStore(
    (listener) => {
      const subscription = client.halo.identity.subscribe(listener);
      return () => subscription.unsubscribe();
    },
    () => client.halo.identity.get(),
  );

  return identity;
};
