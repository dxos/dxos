//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import React, { MutableRefObject, ReactNode, useState, Context, createContext, useContext } from 'react';

import { ClientOptions, Client } from '@dxos/client';
import type { ClientServices } from '@dxos/client-services';
import { ConfigProvider } from '@dxos/config';
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

export type ClientProvider = Client | Provider<Promise<Client>>;

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
   * Forward reference to provide client object to outercontainer since it won't have access to the context.
   * @deprecated
   */
  // TODO(burdon): Currently required by ErrorBoundary provider to reset client on fatal error.
  //  - The boundary must be outside of the provider. Replace with global action handler?
  clientRef?: MutableRefObject<Client | undefined>;

  /**
   * Client object or async provider to enable to caller to do custom initialization.
   */
  client?: ClientProvider;

  /**
   * ReactNode to display until the client is available.
   */
  fallback?: ReactNode;

  /**
   * Config object or async provider.
   */
  config?: ConfigProvider;

  /**
   * Runtime objects.
   */
  options?: ClientOptions;

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
  clientRef,
  client: clientProvider,
  config: configProvider,
  options,
  onInitialize,
  fallback = null
}: ClientProviderProps) => {
  const [client, setClient] = useState<Client | undefined>(
    clientProvider instanceof Client ? clientProvider : undefined
  );

  useAsyncEffect(async () => {
    if (!client) {
      const done = async (client: Client) => {
        log(`Created client: ${client}`);
        if (clientRef) {
          clientRef.current = client;
        }
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
        await client.initialize();
        await done(client);
      }
    }
  }, [clientProvider, configProvider, options]);

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
