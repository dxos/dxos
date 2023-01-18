//
// Copyright 2020 DXOS.org
//

import React, {
  ReactNode,
  useState,
  Context,
  createContext,
  useContext,
  useEffect,
  FunctionComponent,
  useReducer
} from 'react';

import { asyncTimeout } from '@dxos/async';
import { Client } from '@dxos/client';
import type { ClientServices, ClientServicesProvider } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { raise } from '@dxos/debug';
import { log } from '@dxos/log';
import { Status } from '@dxos/protocols/proto/dxos/client';
import { getAsyncValue, Provider } from '@dxos/util'; // TODO(burdon): Deprecate "util"?

import { printBanner } from '../banner';

export type ClientContextProps = {
  client: Client;

  status?: Status;

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
  fallback?: FunctionComponent<Partial<ClientContextProps>>;

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
  fallback: Fallback = () => null,
  onInitialize
}: ClientProviderProps) => {
  const [{ client, status }, dispatch] = useReducer(
    (state: Partial<ClientContextProps>, action: Partial<ClientContextProps>) => {
      if (action.client) {
        state.client = action.client;
      }

      if (action.status) {
        state.status = action.status;
      }

      return state;
    },
    clientProvider instanceof Client ? { client: clientProvider, status: Status.OK } : {}
  );

  const [error, setError] = useState();

  if (error) {
    throw error;
  }

  useEffect(() => {
    if (!client) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const { status } = await asyncTimeout(client.getStatus(), 500);
        log('status', { status });
        dispatch({ status });
      } catch (err) {
        log.error('heartbeat stalled');
        dispatch({ status: undefined });
      }
    }, 1_000);

    return () => clearInterval(interval);
  }, [client]);

  useEffect(() => {
    const done = async (client: Client) => {
      log('client ready', { client });
      const { status } = await client.getStatus();
      await onInitialize?.(client);
      dispatch({ client, status });
      printBanner(client);
    };

    const timeout = setTimeout(async () => {
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
    });

    return () => {
      log('clean up');
      clearTimeout(timeout);
      void client?.destroy().catch((err) => log.catch(err));
    };
  }, [clientProvider, configProvider, createServices]);

  if (!client || status !== Status.OK) {
    return <Fallback client={client} status={status} />;
  }

  // prettier-ignore
  return (
    <ClientContext.Provider value={{ client, status }}>
      {children}
    </ClientContext.Provider>
  );
};
