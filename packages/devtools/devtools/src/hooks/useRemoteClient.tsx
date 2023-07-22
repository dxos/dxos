//
// Copyright 2022 DXOS.org
//

import { useState } from 'react';

import { useAsyncEffect } from '@dxos/react-async';
import {
  Config,
  Defaults,
  Dynamics,
  Client,
  ClientServices,
  DEFAULT_CLIENT_ORIGIN,
  fromIFrame,
  fromHost,
  fromSocket,
  ClientContextProps,
} from '@dxos/react-client';

const DEFAULT_TARGET = `vault:${DEFAULT_CLIENT_ORIGIN}`;

export const useRemoteClient = () => {
  const [client, setClient] = useState<ClientContextProps>();
  useAsyncEffect(async () => {
    setClient(await createClientContext());
  }, []);

  return client;
};

const createClientContext = async (): Promise<ClientContextProps> => {
  /**
   * Create client from remote source.
   */
  const fromRemoteSource = async (remoteSource?: string) => {
    const remoteSourceConfig = remoteSource
      ? {
          runtime: {
            client: {
              remoteSource,
            },
          },
        }
      : {};

    const config = new Config(remoteSourceConfig, await Dynamics(), Defaults());
    const servicesProvider = await (remoteSource ? fromIFrame(config) : fromHost(config));
    const client = new Client({ config, services: servicesProvider });
    await client.initialize();

    return { client, services: servicesProvider.services as ClientServices };
  };

  const targetResolvers: Record<string, (remoteSource?: string) => Promise<ClientContextProps>> = {
    local: () => fromRemoteSource(),
    vault: (target) => {
      if (!target) {
        throw new Error('Vault URL is required target=vault:<vault URL>');
      }

      return fromRemoteSource(target.slice(target.indexOf(':') + 1));
    },
    ws: async (target) => {
      if (!target) {
        throw new Error('WebSocket URL is required target=ws:<ws URL>');
      }

      const client = new Client({ config: new Config(), services: fromSocket(target) });
      await client.initialize();

      return { client, services: client.services.services as ClientServices };
    },
  };

  // Configure vault.
  const searchParams = new URLSearchParams(window.location.search);
  const target = searchParams.get('target') ?? DEFAULT_TARGET;
  const [protocol] = target.split(':');
  if (!(protocol in targetResolvers)) {
    throw new Error(`Unknown target: ${target}. Available targets are: ${Object.keys(targetResolvers).join(', ')}`);
  }

  return targetResolvers[protocol](target);
};
