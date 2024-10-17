//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { type Client, type SystemStatus } from '@dxos/client';

export const useClientStatus = (client: Client) => {
  const [status, setStatus] = useState<SystemStatus | null>();
  useEffect(() => {
    if (!client) {
      return;
    }

    const subscription = client.status.subscribe((status) => setStatus(status));
    return () => subscription.unsubscribe();
  }, [client, setStatus]);

  return status;
};
