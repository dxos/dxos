//
// Copyright 2020 DXOS.org
//

import React, {
  forwardRef,
  type FunctionComponent,
  type ReactNode,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';

import { Client, type ClientOptions, type ClientServicesProvider, SystemStatus } from '@dxos/client';
import { type Config } from '@dxos/config';
import { type S } from '@dxos/echo-schema';
import { registerSignalFactory } from '@dxos/echo-signals/react';
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
     * Config object or async provider.
     */
    config?: Config | Provider<Promise<Config>>;

    /**
     * Client object or async provider to enable to caller to do custom initialization.
     *
     * Most apps won't need this.
     */
    client?: Client | Provider<Promise<Client>>;

    /**
     * Callback to enable the caller to create a custom ClientServicesProvider.
     * NOTE: If a `client` is provided then `services` are ignored.
     *
     * Most apps won't need this.
     */
    services?: ClientServicesProvider | ((config?: Config) => MaybePromise<ClientServicesProvider>);

    /**
     * List of schema to register.
     */
    types?: S.Schema<any>[];

    /**
     * ReactNode to display until the client is available.
     */
    fallback?: FunctionComponent<Partial<ClientContextProps>>;

    /**
     * Set to false to stop default signal factory from being registered.
     */
    // TODO(burdon): Requires comment describing why signals are required.
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
      registerSignalFactory: _registerSignalFactory = true,
      onInitialized,
      ...options
    },
    forwardedRef,
  ) => {
    useMemo(() => {
      // TODO(wittjosiah): Ideally this should be imported asynchronously because it is optional.
      //   Unfortunately, async import seemed to break signals React instrumentation.
      _registerSignalFactory && registerSignalFactory();
    }, []);

    // TODO(burdon): Comment about when this happens and how it's caught (ErrorBoundary?)
    const [error, setError] = useState();
    if (error) {
      throw error;
    }

    // TODO(burdon): If already initialized then adding types may happen after rendering.
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
          await onInitialized?.(client);
          log('initialization complete');
        }

        // TODO(burdon): This might get skipped if client set directly.
        if (types) {
          client.addTypes(types);
        }

        setClient(client);

        // TODO(burdon): Remove since set by hook above?
        setStatus(client.status.get() ?? SystemStatus.ACTIVE);

        // TODO(burdon): Make dynamic.
        const showBanner = false;
        if (showBanner) {
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
    }, [configProvider, clientProvider, servicesProvider]);

    if (!client?.initialized || status !== SystemStatus.ACTIVE) {
      return <Fallback client={client} status={status} />;
    }

    return <ClientContext.Provider value={{ client, status }}>{children}</ClientContext.Provider>;
  },
);
