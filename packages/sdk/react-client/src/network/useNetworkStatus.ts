//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { NetworkStatus } from '@dxos/protocols/proto/dxos/client/services';

import { useClient } from '../client';

/**
 * Creates a network status subscription.
 */
export const useNetworkStatus = (): NetworkStatus => {
  const client = useClient();
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus[]>(client.mesh.getNetworkStatus().value);

  useEffect(() => {
    const result = client.mesh.getNetworkStatus();
    setNetworkStatus(result.value);

    const unsubscribe = result.subscribe(() => {
      setNetworkStatus(result.value);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return networkStatus[0];
};
