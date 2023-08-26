//
// Copyright 2022 DXOS.org
//

import { useState } from 'react';

import { log } from '@dxos/log';
import { useAsyncEffect } from '@dxos/react-async';
import {
  DEFAULT_CLIENT_ORIGIN,
  Config,
  Defaults,
  Dynamics,
  Client,
  fromIFrame,
  fromHost,
  fromSocket,
} from '@dxos/react-client';

const DEFAULT_TARGET = `vault:${DEFAULT_CLIENT_ORIGIN}`;

/**
 * Construct client from search params.
 */
export const useRemoteClient = () => {
  const [client, setClient] = useState<Client>();
  useAsyncEffect(async () => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const target = searchParams.get('target') ?? DEFAULT_TARGET;
      const client = await createClient(target);
      setClient(client);
    } catch (err: any) {
      log.catch(err);
    }
  }, []);

  return client;
};

/**
 * Create client from target spec.
 */
export const createClient = async (spec: string): Promise<Client> => {
  const [protocol] = spec.split(':');
  const resolver = targetResolvers[protocol];
  if (!resolver) {
    throw new Error(`Invalid type: ${spec} [${Object.keys(targetResolvers).join(', ')}]`);
  }

  return await resolver(spec);
};

const targetResolvers: Record<string, (target: string) => Promise<Client>> = {
  //
  // Local.
  //
  local: async () => {
    const config = new Config();
    const services = await fromHost(config);
    const client = new Client({ config, services });
    await client.initialize();
    return client;
  },

  //
  // Web socket.
  //
  ws: async (target) => {
    if (!target) {
      throw new Error('WebSocket URL is required; e.g., "target=ws://localhost:5001"');
    }

    const config = new Config();
    const services = fromSocket(target);
    const client = new Client({ config, services });
    await client.initialize();
    return client;
  },

  //
  // Browser shared worker.
  //
  vault: async (target) => {
    if (!target) {
      throw new Error('Vault URL is required; e.g., "target=vault:http://localhost:5173/vault.html"');
    }

    const config = new Config(
      {
        runtime: {
          client: {
            remoteSource: target.slice(target.indexOf(':') + 1),
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
  },
};
