//
// Copyright 2022 DXOS.org
//

import { useState } from 'react';

import { log } from '@dxos/log';
import { useAsyncEffect } from '@dxos/react-async';
import {
  DEFAULT_VAULT_ORIGIN,
  Config,
  Defaults,
  Dynamics,
  Client,
  fromIFrame,
  fromHost,
  fromSocket,
} from '@dxos/react-client';

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

/**
 * Create client from target URL.
 */
export const createClient = async (target: string): Promise<Client> => {
  const url = new URL(target);
  const protocol = url.protocol.slice(0, -1);
  switch (protocol) {
    case 'ws':
    case 'wss': {
      const config = new Config();
      const services = fromSocket(target);
      const client = new Client({ config, services });
      await client.initialize();
      return client;
    }

    case 'http':
    case 'https': {
      const config = new Config(
        {
          runtime: {
            client: {
              remoteSource: target + '/vault.html',
            },
          },
        },
        await Dynamics(),
        Defaults(),
      );
      const services = await fromIFrame(config);
      const client = new Client({ config, services });
      await client.initialize();
      return client;
    }

    default: {
      const config = new Config();
      const services = await fromHost(config);
      const client = new Client({ config, services });
      await client.initialize();
      return client;
    }
  }
};
