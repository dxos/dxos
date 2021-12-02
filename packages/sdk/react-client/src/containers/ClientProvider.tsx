//
// Copyright 2020 DXOS.org
//

import React, { ReactNode, useEffect, useState } from 'react';

import { Client, ClientOptions } from '@dxos/client';
import { Config, defs } from '@dxos/config';
import { MaybeFunction, MaybePromise, getAsyncValue } from '@dxos/util';

import { ClientContext } from '../hooks';

export type ClientProvider = MaybeFunction<MaybePromise<Client>>

// TODO(burdon): Why defs?
export type ConfigProvider = MaybeFunction<MaybePromise<defs.Config | Config>>

export interface ClientProviderProps {
  client?: ClientProvider
  config?: ConfigProvider
  options?: ClientOptions
  children?: ReactNode
}

/**
 * Root component that provides the DXOS client instance to child components.
 * To be used with the `useClient` hook.
 */
export const ClientProvider = ({
  client: clientProvider,
  config: configProvider,
  options,
  children
}: ClientProviderProps) => {
  const [client, setClient] = useState<Client | undefined>(
    typeof clientProvider !== 'function' ? clientProvider as Client : undefined);

  // Async helpers.
  useEffect(() => {
    if (!client) {
      setImmediate(async () => {
        if (clientProvider) {
          // Asynchornously request client.
          setClient(await getAsyncValue(clientProvider));
        } else {
          // Asynchronously construt client (config may be undefined).
          const config = await getAsyncValue(configProvider);
          const client = new Client(config, options);
          await client.initialize();
          setClient(client);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (client) {
      (window as any).__DXOS__ = client.getDevtoolsContext();
    }
  }, [client]);

  if (!client) {
    return null;
  }

  return (
    <ClientContext.Provider value={client}>
      {children}
    </ClientContext.Provider>
  );
};
