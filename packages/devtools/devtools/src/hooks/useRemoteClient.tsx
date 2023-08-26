//
// Copyright 2022 DXOS.org
//

import { useState } from 'react';

import { createClient } from '@dxos/client/services';
import { log } from '@dxos/log';
import { useAsyncEffect } from '@dxos/react-async';
import { DEFAULT_VAULT_ORIGIN, Client } from '@dxos/react-client';

/**
 * Construct client from search params.
 */
export const useRemoteClient = () => {
  const [client, setClient] = useState<Client>();
  useAsyncEffect(async () => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const target = searchParams.get('target') ?? DEFAULT_VAULT_ORIGIN;
      const client = await createClient(target);
      setClient(client);
    } catch (err: any) {
      log.catch(err);
    }
  }, []);

  return client;
};
