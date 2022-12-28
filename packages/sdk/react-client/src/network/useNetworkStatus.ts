//
// Copyright 2020 DXOS.org
//

import { useState } from 'react';

import { NetworkStatus } from '@dxos/protocols/proto/dxos/client/services';
import { useAsyncEffect } from '@dxos/react-async';

import { useClient } from '../client';

export const useNetworkStatus = () => {
  const client = useClient();
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>();

  useAsyncEffect(async () => {
    setNetworkStatus(client.mesh.networkStatus);
  }, [client.mesh.networkStatus]);

  return networkStatus;
};
