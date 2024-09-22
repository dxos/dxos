//
// Copyright 2020 DXOS.org
//

import React, { type FunctionComponent, type ReactNode, useEffect, useMemo, useState } from 'react';

import { Client, type ClientOptions, type ClientServicesProvider, SystemStatus } from '@dxos/client';
import { type Config } from '@dxos/config';
import { type S } from '@dxos/echo-schema';
import { registerSignalFactory } from '@dxos/echo-signals/react';
import { log } from '@dxos/log';
import { useControlledValue } from '@dxos/react-ui';
import { getAsyncProviderValue, type MaybePromise, type Provider } from '@dxos/util';

import { ClientContext, type ClientContextProps } from './context';
import { printBanner } from '../banner';

/**
 * Properties for the ClientProvider.
 */
export type ClientProviderProps = Pick<ClientContextProps, 'status'> &
  Omit<ClientOptions, 'config' | 'services'> & {
    children?: ReactNode;

    /**
     * Config object or async provider.
     */
    config?: Config | Provider<Promise<Config>>;

    /**
     * Client object or async provider to enable to caller to do custom initialization.
     *
     * Most apps won't need this.
     */
    // TODO(wittjosiah): Remove async and just use to keeping reference to client?
    //   (Preferring `onInitialized` for custom initialization.)
    client?: Client | Provider<Promise<Client>>;

    /**
     * Callback to enable the caller to create a custom ClientServicesProvider.
     *
     * Most apps won't need this.
     */
    services?: ClientServicesProvider | ((config?: Config) => MaybePromise<ClientServicesProvider>);

    /**
     *
     */
    types?: S.Schema<any>[];

    /**
     * ReactNode to display until the client is available.
     */
    fallback?: FunctionComponent<Partial<ClientContextProps>>;

    /**
     * Set to false to stop default signal factory from being registered.
     */
    // TODO(burdon): Move to options.
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
  client: clientProvider,
  services: servicesProvider,
  types,
  status: controlledStatus,
  fallback: Fallback = () => null,
  registerSignalFactory: _registerSignalFactory = true,
  onInitialized,
  ...options
}: ClientProviderProps) => {
  useMemo(() => {
    // TODO(wittjosiah): Ideally this should be imported asynchronously because it is optional.
    //   Unfortunately, async import seemed to break signals React instrumentation.
    _registerSignalFactory && registerSignalFactory();
  }, []);

  const [client, setClient] = useState(clientProvider instanceof Client ? clientProvider : undefined);
  const [status, setStatus] = useControlledValue(controlledStatus);
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
      if (types) {
        client.addTypes(types);
      }

      setClient(client);
      setStatus(client.status.get() ?? SystemStatus.ACTIVE);
      printBanner(client);
    };

    // TODO(burdon): queueMicrotask?
    const timeout = setTimeout(async () => {
      if (clientProvider) {
        // Asynchronously request client.
        const client = await getAsyncProviderValue(clientProvider);
        await done(client);
      } else {
        // Asynchronously construct client (config may be undefined).
        const config = await getAsyncProviderValue(configProvider);
        log('resolved config', { config });
        const services = await getAsyncProviderValue(servicesProvider, config);
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
  }, [clientProvider, configProvider, servicesProvider]);

  if (!client || status !== SystemStatus.ACTIVE) {
    return <Fallback client={client} status={status} />;
  }

  return <ClientContext.Provider value={{ client, status }}>{children}</ClientContext.Provider>;
};
