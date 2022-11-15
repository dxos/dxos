//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import React, { ReactNode, useState, Context, createContext, useContext } from 'react';

import { ClientOptions, Client } from '@dxos/client';
import type { ClientServices } from '@dxos/client-services';
import { ConfigLike } from '@dxos/config';
import { raise } from '@dxos/debug';
import { useAsyncEffect } from '@dxos/react-async';
import { getAsyncValue, Provider } from '@dxos/util'; // TODO(burdon): Deprecate "util"?

import { printBanner } from '../banner';

const log = debug('dxos:react-client');
type ClientContextProps = {
  client: Client;

  // Optionally expose services (e.g., for devtools).
  services?: ClientServices;
};

export const ClientContext: Context<ClientContextProps | undefined> = createContext<ClientContextProps | undefined>(
  undefined
);

/**
 * Hook returning instance of DXOS client.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useClient = () => {
  const { client } = useContext(ClientContext) ?? raise(new Error('Missing ClientContext.'));
  return client;
};

export interface ClientProviderProps {
  children?: ReactNode;

  /**
   * Config object or async provider.
   */
  config?: ConfigLike | Provider<Promise<ConfigLike>>;

  /**
   * Client object or async provider to enable to caller to do custom initialization.
   */
  client?: Client | Provider<Promise<Client>>;

  /**
   * Runtime objects.
   */
  options?: ClientOptions;

  /**
   * ReactNode to display until the client is available.
   */
  fallback?: ReactNode;

  /**
   * Post initialization hook.
   * @param Client
   */
  onInitialize?: (client: Client) => Promise<void>;
}

/**
 * Root component that provides the DXOS client instance to child components.
 * To be used with the `useClient` hook.
 */
export const ClientProvider = ({
  children,
  client: clientProvider,
  config: configProvider,
  options,
  onInitialize,
  fallback = null
}: ClientProviderProps) => {
  const [client, setClient] = useState<Client>();

  useAsyncEffect(async () => {
    const done = async (client: Client) => {
      log(`Created client: ${client}`);
      await client.initialize();
      await onInitialize?.(client);
      setClient(client);
      printBanner(client);
    };

    if (clientProvider) {
      // Asynchronously request client.
      const client = await getAsyncValue(clientProvider);
      await done(client);
    } else {
      // Asynchronously construct client (config may be undefined).
      const config = await getAsyncValue(configProvider);
      const client = new Client({ config });
      await done(client);
    }
  }, [clientProvider, configProvider, options, onInitialize]);

  if (!client) {
    return fallback as JSX.Element;
  }

  // prettier-ignore
  return (
    <ClientContext.Provider value={{ client }}>
      {children}
    </ClientContext.Provider>
  );
};
