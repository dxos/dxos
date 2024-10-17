//
// Copyright 2020 DXOS.org
//

import { type NetworkStatus } from '@dxos/client/mesh';
import { useMulticastObservable } from '@dxos/react-hooks';

import { useClient } from '../client';

/**
 * Creates a network status subscription.
 */
export const useNetworkStatus = (): NetworkStatus => {
  const client = useClient();
  return useMulticastObservable(client.mesh.networkStatus);
};
