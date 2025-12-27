//
// Copyright 2020 DXOS.org
//

import React, {
  type FunctionComponent,
  type PropsWithChildren,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';

import { Client, type ClientOptions, type ClientServicesProvider, SystemStatus } from '@dxos/client';
import { type Config } from '@dxos/config';
import { registerSignalsRuntime } from '@dxos/echo-signals/react';
import { log } from '@dxos/log';
import { useAsyncEffect, useControlledState } from '@dxos/react-hooks';
import { type MaybePromise, type Provider, getAsyncProviderValue } from '@dxos/util';

import { printBanner } from '../banner';

import { ClientContext, type ClientContextProps } from './context';

/**
 * Properties for the ClientProvider.
 */
export type ClientProviderProps = Omit<ClientOptions, 'config' | 'services'> &
  Pick<ClientContextProps, 'status'> &
  PropsWithChildren<{
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
    // TODO(burdon): Reconcile with ClientOptions.
    config?: Config | Provider<Promise<Config>>;

    /**
     * Callback to enable the caller to create a custom ClientServicesProvider.
     *
     * NOTE: If a `client` is provided then `services` is ignored.
     */
    // TODO(burdon): Reconcile with ClientOptions.
    services?: ClientServicesProvider | ((config?: Config) => MaybePromise<ClientServicesProvider>);

    /**
     * ReactNode to display until the client is available.
     */
    fallback?: FunctionComponent<Partial<ClientContextProps>>;

    /**
     * Enable (by default) registration of Preact signals runtime for reactive ECHO objects.
     * @see https://www.npmjs.com/package/@preact/signals-react
     */
    signalsRuntime?: boolean;

    /**
     * Skip the DXOS banner.
     */
    noBanner?: boolean;

    /**
     * Post initialization hook to enable to caller to do custom initialization.
     */
    onInitialized?: (client: Client) => MaybePromise<void>;
  }>;

/**
 * Root component that provides the DXOS client instance to child components.
 * To be used with the `useClient` hook.
 */
export const ClientProvider = forwardRef<Client | undefined, ClientProviderProps>(
  (
    {
      children,
      config: configProp,
      client: clientProp,
      services: servicesProp,
      status: statusProp,
      fallback: Fallback = () => null,
      signalsRuntime = true,
      noBanner,
      onInitialized,
      ...options
    },
    forwardedRef,
  ) => {
    useEffect(() => {
      // TODO(wittjosiah): Ideally this should be imported asynchronously because it is optional.
      //   Unfortunately, async import seemed to break signals React instrumentation.
      signalsRuntime && registerSignalsRuntime();
    }, []);

    // The client is initialized asynchronously.
    // If an error occurs during initialization, it is caught and the state is set.
    // This allows the error to be thrown in the render method.
    // The assumption is that a client initialization error is fatal to the app.
    // This error will be caught by the nearest error boundary.
    const [error, setError] = useState();
    if (error) {
      throw error;
    }

    const [client, setClient] = useState(clientProp instanceof Client ? clientProp : undefined);

    // Provide external access.
    useImperativeHandle(forwardedRef, () => client, [client]);

    // Client status subscription.
    const [status, setStatus] = useControlledState(statusProp);
    useEffect(() => {
      if (!client) {
        return;
      }

      const subscription = client.status.subscribe((status) => setStatus(status));
      return () => subscription.unsubscribe();
    }, [client]);

    // Create and/or initialize client.
    useAsyncEffect(async () => {
      let disposed = false;
      const initialize = async (client: Client) => {
        if (!client.initialized) {
          await client.initialize().catch((err) => {
            if (!disposed) {
              setError(err);
            }
          });
          log('client ready');
          await onInitialized?.(client);
          log('initialization complete');
        }

        setClient(client);
        if (!noBanner) {
          printBanner(client);
        }
      };

      let client: Client;
      try {
        if (clientProp) {
          // Asynchronously request client.
          client = await getAsyncProviderValue(clientProp);
          await initialize(client);
        } else {
          // Asynchronously construct client (config may be undefined).
          const config = await getAsyncProviderValue(configProp);
          log('resolved config', { config });
          const services = await getAsyncProviderValue(servicesProp, config);
          log('created services', { services });
          client = new Client({ config, services, ...options });
          log('created client');
          await initialize(client);
        }
      } catch (err) {
        if (!disposed) {
          log.catch(err);
        }
      }

      return () => {
        log('clean up');
        disposed = true;
        // Only destroy if the client is not provided by the parent.
        if (!clientProp) {
          void client
            ?.destroy()
            .then(() => {
              log('destroyed');
            })
            .catch((err) => log.catch(err));
        }
      };
    }, [configProp, clientProp, servicesProp, noBanner]);

    if (!client?.initialized || status !== SystemStatus.ACTIVE) {
      return <Fallback client={client} status={status} />;
    }

    return <ClientContext.Provider value={{ client, status }}>{children}</ClientContext.Provider>;
  },
);
