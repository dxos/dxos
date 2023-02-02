//
// Copyright 2020 DXOS.org
//

import React, { ReactNode, useState, Context, createContext, useContext, useEffect, FunctionComponent } from 'react';

import { asyncTimeout } from '@dxos/async';
import { Client, Status } from '@dxos/client';
import type { ClientServices, ClientServicesProvider } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { raise } from '@dxos/debug';
import { log } from '@dxos/log';
import { getAsyncValue, Provider } from '@dxos/util'; // TODO(burdon): Deprecate "util"?

import { printBanner } from '../banner';
import { SpaceProvider } from '../echo';
import { ShellProvider } from '../os';

export type ClientContextProps = {
  client: Client;

  // Optionally expose services (e.g., for devtools).
  services?: ClientServices;

  status?: Status;
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
  services?: (config?: Config) => ClientServicesProvider;

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
   * Whether or not to include a SpaceProvider as a child.
   *
   * Default is true.
   */
  spaceProvider?: boolean;

  /**
   * Whether or not to include a ShellProvider as a child.
   *
   * Default is true.
   */
  shellProvider?: boolean;

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
  spaceProvider = true,
  shellProvider = true,
  onInitialize
}: ClientProviderProps) => {
  const [client, setClient] = useState(clientProvider instanceof Client ? clientProvider : undefined);
  const [status, setStatus] = useState<Status>();
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
        const response = await asyncTimeout(client.getStatus(), 500);
        log('status', response);
        // TODO(wittjosiah): Remove fallback once HALO is live with new status RPC.
        setStatus(response.status ?? Status.ACTIVE);
      } catch (err) {
        log.error('heartbeat stalled');
        setStatus(undefined);
      }
    }, 1_000);

    return () => clearInterval(interval);
  }, [client]);

  useEffect(() => {
    const done = async (client: Client) => {
      log('client ready', { client });
      await onInitialize?.(client);
      const response = await client.getStatus();
      log('status', response);
      setClient(client);
      // TODO(wittjosiah): Remove fallback once HALO is live with new status RPC.
      setStatus(response.status ?? Status.ACTIVE);
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
        const services = createServices?.(config);
        log('created services', { services });
        const client = new Client({ config, services });
        log('created client', { client });
        await client
          .initialize()
          .then(() => done(client))
          .catch((err) => setError(err));
      }
    });

    return () => {
      log('clean up');
      clearTimeout(timeout);
      void client?.destroy().catch((err) => log.catch(err));
    };
  }, [clientProvider, configProvider, createServices]);

  if (!client || status !== Status.ACTIVE) {
    return <Fallback client={client} status={status} />;
  }

  if (shellProvider) {
    children = <ShellProvider>{children}</ShellProvider>;
  }

  if (spaceProvider) {
    children = <SpaceProvider>{children}</SpaceProvider>;
  }

  // prettier-ignore
  return (
    <ClientContext.Provider value={{ client, status }}>
      {children}
    </ClientContext.Provider>
  );
};
