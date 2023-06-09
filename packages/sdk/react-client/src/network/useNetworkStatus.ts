//
// Copyright 2020 DXOS.org
//

import { useSyncExternalStore } from 'react';

import { NetworkStatus } from '@dxos/protocols/proto/dxos/client/services';

import { useClient } from '../client';

/**
 * Creates a network status subscription.
 */
export const useNetworkStatus = (): NetworkStatus => {
  const client = useClient();
  const networkStatus = useSyncExternalStore(
    (listener) => {
      const subscription = client.mesh.networkStatus.subscribe(listener);
      return () => subscription.unsubscribe();
    },
    () => client.mesh.networkStatus.get(),
  );

  return networkStatus;
};
