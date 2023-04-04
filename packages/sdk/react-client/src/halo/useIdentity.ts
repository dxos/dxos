//
// Copyright 2020 DXOS.org
//

import { useEffect, useSyncExternalStore } from 'react';

import { IFrameClientServicesProxy, ShellLayout } from '@dxos/client';

import { useClient } from '../client';

/**
 * Hook returning DXOS identity object.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useIdentity = (options?: { login?: boolean }) => {
  const { login } = { login: false, ...options };
  const client = useClient();
  const identity = useSyncExternalStore(
    (listener) => {
      const subscription = client.halo.identity.subscribe(listener);
      return () => subscription.unsubscribe();
    },
    () => client.halo.identity.get()
  );

  useEffect(() => {
    if (login && !identity && client.services instanceof IFrameClientServicesProxy) {
      void client.services.setLayout(ShellLayout.INITIALIZE_IDENTITY);
    }
  }, [client, identity, login]);

  return identity;
};
