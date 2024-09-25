//
// Copyright 2020 DXOS.org
//

import React, {
  forwardRef,
  type FunctionComponent,
  type ReactNode,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';

import { Client, type ClientOptions, type ClientServicesProvider, SystemStatus } from '@dxos/client';
import { type Config } from '@dxos/config';
import { type S } from '@dxos/echo-schema';
import { registerSignalRuntime } from '@dxos/echo-signals/react';
import { log } from '@dxos/log';
import { useControlledValue } from '@dxos/react-hooks';
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
     * Client object or async provider to enable to caller to do custom initialization.
     *
     * NOTE: For advanced use cases only.
     */
    client?: Client | Provider<Promise<Client>>;

    /**
     * Config object or async provider.
     *
     * NOTE: If a `client` is provided then `config` is ignored.
     */
    config?: Config | Provider<Promise<Config>>;

    /**
     * Callback to enable the caller to create a custom ClientServicesProvider.
     *
     * NOTE: If a `client` is provided then `services` is ignored.
     */
    services?: ClientServicesProvider | ((config?: Config) => MaybePromise<ClientServicesProvider>);

    /**
     * List of schema to register.
     *
     * NOTE: If a `client` is provided then `types` will not be added until after the children are first rendered.
     */
    types?: S.Schema<any>[];

    /**
     * ReactNode to display until the client is available.
     */
    fallback?: FunctionComponent<Partial<ClientContextProps>>;

    /**
     * Set to false to stop default signal runtime from being registered.
     *
     * The signals runtime is used to provide reactive updates to ECHO objects.
     */
    registerSignalRuntime?: boolean;

    /**
     * Skip the DXOS banner print.
     */
    disableBanner?: boolean;

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
export const ClientProvider = forwardRef<Client | undefined, ClientProviderProps>(
  (
    {
      children,
      config: configProvider,
      client: clientProvider,
      services: servicesProvider,
      types,
      status: controlledStatus,
      fallback: Fallback = () => null,
      registerSignalRuntime: _registerSignalRuntime = true,
      disableBanner,
      onInitialized,
      ...options
    },
    forwardedRef,
  ) => {
    useEffect(() => {
      // TODO(wittjosiah): Ideally this should be imported asynchronously because it is optional.
      //   Unfortunately, async import seemed to break signals React instrumentation.
      _registerSignalRuntime && registerSignalRuntime();
    }, [_registerSignalRuntime]);

    // The client is initialized asynchronously.
    // If an error occurs during initialization, it is caught and the state is set.
    // This allows the error to be thrown in the render method.
    // The assumption is that a client initialization error is fatal to the app.
    // This error will be caught by the nearest error boundary.
    const [error, setError] = useState();
    if (error) {
      throw error;
    }

    const [client, setClient] = useState(clientProvider instanceof Client ? clientProvider : undefined);

    // Provide external access.
    useImperativeHandle(forwardedRef, () => client, [client]);

    // Client status subscription.
    const [status, setStatus] = useControlledValue(controlledStatus);
    useEffect(() => {
      if (!client) {
        return;
      }

      const subscription = client.status.subscribe((status) => setStatus(status));
      return () => subscription.unsubscribe();
    }, [client]);

    // Create and/or initialize client.
    useEffect(() => {
      const initialize = async (client: Client) => {
        if (!client.initialized) {
          await client.initialize().catch(setError);
          log('client ready');
          if (types) {
            client.addTypes(types);
          }
          await onInitialized?.(client);
          log('initialization complete');
        } else if (types) {
          client.addTypes(types);
        }

        setClient(client);

        if (!disableBanner) {
          printBanner(client);
        }
      };

      let client: Client;
      const t = setTimeout(async () => {
        if (clientProvider) {
          // Asynchronously request client.
          client = await getAsyncProviderValue(clientProvider);
          await initialize(client);
        } else {
          // Asynchronously construct client (config may be undefined).
          const config = await getAsyncProviderValue(configProvider);
          log('resolved config', { config });
          const services = await getAsyncProviderValue(servicesProvider, config);
          log('created services', { services });
          client = new Client({ config, services, ...options });
          log('created client');
          await initialize(client);
        }
      });

      return () => {
        log('clean up');
        clearTimeout(t);
        void client
          ?.destroy()
          .then(() => {
            log('destroyed');
          })
          .catch((err) => log.catch(err));
      };
    }, [configProvider, clientProvider, servicesProvider, disableBanner]);

    if (!client?.initialized || status !== SystemStatus.ACTIVE) {
      return <Fallback client={client} status={status} />;
    }

    return <ClientContext.Provider value={{ client, status }}>{children}</ClientContext.Provider>;
  },
);
