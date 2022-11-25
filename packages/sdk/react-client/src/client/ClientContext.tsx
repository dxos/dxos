//
// Copyright 2020 DXOS.org
//

import React, { ReactNode, useState, Context, createContext, useContext } from 'react';

import { Client } from '@dxos/client';
import type { ClientServices, ClientServicesProvider } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { raise } from '@dxos/debug';
import { log } from '@dxos/log';
import { useAsyncEffect } from '@dxos/react-async';
import { getAsyncValue, Provider } from '@dxos/util'; // TODO(burdon): Deprecate "util"?

import { printBanner } from '../banner';

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
  config?: Config | Provider<Promise<Config>>;

  /**
   * Callback to enable the caller to create a custom ClientServicesProvider.
   *
   * Most apps won't need this.
   */
  services?: (config: Config) => ClientServicesProvider;

  /**
   * Client object or async provider to enable to caller to do custom initialization.
   *
   * Most apps won't need this.
   */
  client?: Client | Provider<Promise<Client>>;

  /**
   * ReactNode to display until the client is available.
   */
  fallback?: ReactNode;

  /**
   * Post initialization hook.
   * @param Client
   * @deprecated Previously used to register models.
   */
  onInitialize?: (client: Client) => Promise<void>;
}

/**
 * Root component that provides the DXOS client instance to child components.
 * To be used with the `useClient` hook.
 */
export const ClientProvider = ({
  children,
  config: configProvider,
  services: createServices,
  client: clientProvider,
  fallback = null,
  onInitialize
}: ClientProviderProps) => {
  const [client, setClient] = useState<Client | undefined>(
    clientProvider instanceof Client ? clientProvider : undefined
  );
  const [error, setError] = useState();

  if (error) {
    throw error;
  }

  useAsyncEffect(async () => {
    const done = async (client: Client) => {
      log('client ready', { client });
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
      log('resolved config', { config });
      const services = config && createServices?.(config);
      log('created services', { services });
      const client = new Client({ config, services });
      log('created client', { client });
      await client.initialize().catch((err) => setError(err));
      await done(client);
    }
  }, [clientProvider, configProvider, createServices]);

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
