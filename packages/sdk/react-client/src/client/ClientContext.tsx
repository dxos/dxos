//
// Copyright 2020 DXOS.org
//

import React, {
  type ReactNode,
  useState,
  type Context,
  createContext,
  useContext,
  useEffect,
  type FunctionComponent,
  useMemo,
} from 'react';

import {
  Client,
  SystemStatus,
  type ClientOptions,
  type ClientServices,
  type ClientServicesProvider,
} from '@dxos/client';
import { type Config } from '@dxos/config';
import { raise } from '@dxos/debug';
import { registerSignalFactory } from '@dxos/echo-signals/react';
import { log } from '@dxos/log';
import { getAsyncValue, type MaybePromise, type Provider } from '@dxos/util'; // TODO(burdon): Deprecate "util"?

import { printBanner } from '../banner';

// TODO(burdon): Reconcile with ClientOptions.
export type ClientContextProps = {
  client: Client;

  // Optionally expose services (e.g., for devtools).
  // TODO(burdon): Can't this just be accessed via `client.services`?
  services?: ClientServices;

  status?: SystemStatus | null;
};

export const ClientContext: Context<ClientContextProps | undefined> = createContext<ClientContextProps | undefined>(
  undefined,
);

/**
 * Hook returning instance of DXOS client.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useClient = () => {
  const { client } = useContext(ClientContext) ?? raise(new Error('Missing ClientContext.'));
  return client;
};

/**
 * Properties for the ClientProvider.
 */
export type ClientProviderProps = Omit<ClientOptions, 'config' | 'services'> & {
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
  services?: (config?: Config) => MaybePromise<ClientServicesProvider>;

  /**
   * Client object or async provider to enable to caller to do custom initialization.
   *
   * Most apps won't need this.
   */
  // TODO(wittjosiah): Remove async and just use to keeping reference to client?
  //   (Prefering `onInitialized` for custom initialization.)
  client?: Client | Provider<Promise<Client>>;

  /**
   * ReactNode to display until the client is available.
   */
  // TODO(wittjosiah): Rename to `placeholder`.
  fallback?: FunctionComponent<Partial<ClientContextProps>>;

  /**
   * Set to false to stop default signal factory from being registered.
   */
  registerSignalFactory?: boolean;

  /**
   * Post initialization hook to enable to caller to do custom initialization.
   *
   * @param Client
   */
  onInitialized?: (client: Client) => MaybePromise<void>;
};

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
  registerSignalFactory: register = true,
  onInitialized,
  ...options
}: ClientProviderProps) => {
  useMemo(() => {
    // TODO(wittjosiah): Ideally this should be imported asynchronosly because it is optional.
    //   Unfortunately, async import seemed to break signals React instrumentation.
    register && registerSignalFactory();
  }, []);

  const [client, setClient] = useState(clientProvider instanceof Client ? clientProvider : undefined);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [error, setError] = useState();
  if (error) {
    throw error;
  }

  useEffect(() => {
    if (!client) {
      return;
    }

    const subscription = client.status.subscribe((status) => setStatus(status));
    return () => subscription.unsubscribe();
  }, [client, setStatus]);

  useEffect(() => {
    const done = async (client: Client) => {
      await client.initialize().catch(setError);
      log('client ready');
      await onInitialized?.(client);
      log('initialization complete');
      setClient(client);
      setStatus(client.status.get() ?? SystemStatus.ACTIVE);
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
        const services = await createServices?.(config);
        log('created services', { services });
        const client = new Client({ config, services, ...options });
        log('created client');
        await done(client);
      }
    });

    return () => {
      log('clean up');
      clearTimeout(timeout);
      void client?.destroy().catch((err) => log.catch(err));
    };
  }, [clientProvider, configProvider, createServices]);

  if (!client || status !== SystemStatus.ACTIVE) {
    return <Fallback client={client} status={status} />;
  }

  // prettier-ignore
  return (
    <ClientContext.Provider value={{ client, status }}>
      {children}
    </ClientContext.Provider>
  );
};
