//
// Copyright 2022 DXOS.org
//

import { useState } from 'react';

import { Client, DEFAULT_CLIENT_ORIGIN, fromHost, fromIFrame } from '@dxos/client';
import { ClientServices } from '@dxos/client-services';
import { Config, Defaults, Dynamics } from '@dxos/config';
import { useAsyncEffect } from '@dxos/react-async';
import { ClientContextProps } from '@dxos/react-client';

const DEFAULT_TARGET = `vault:${DEFAULT_CLIENT_ORIGIN}`;

// TODO(burdon): Document (rename?)
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
              remoteSource
            }
          }
        }
      : {};

    const config = new Config(remoteSourceConfig, await Dynamics(), Defaults());
    const servicesProvider = remoteSource ? fromIFrame(config) : fromHost(config);
    const client = new Client({ config, services: servicesProvider });
    await client.initialize();

    return { client, services: servicesProvider.services as ClientServices };
  };

  const targetResolvers: Record<string, (remoteSource?: string) => Promise<ClientContextProps>> = {
    local: () => fromRemoteSource(),
    vault: (remoteSource) => {
      if (!remoteSource) {
        throw new Error('Vault URL is required target=vault:<vault URL>');
      }
      return fromRemoteSource(remoteSource);
    }
  };

  const searchParams = new URLSearchParams(window.location.search);
  const target = searchParams.get('target') ?? DEFAULT_TARGET;
  const [protocol, ...rest] = target.split(':');
  const remoteSource = rest.join(':');
  if (!(protocol in targetResolvers)) {
    throw new Error(`Unknown target: ${target}. Available targets are: ${Object.keys(targetResolvers).join(', ')}`);
  }

  return targetResolvers[protocol](remoteSource);
};
