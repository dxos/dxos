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
    (listener) => client.mesh.networkStatus.subscribe(listener),
    () => client.mesh.networkStatus.get()
  );

  return networkStatus;
};
