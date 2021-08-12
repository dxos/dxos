//
// Copyright 2020 DXOS.org
//

import React, { useState, useEffect, ReactNode } from 'react';

import { LinearProgress } from '@material-ui/core';

import { Client, ClientConfig } from '@dxos/client';
import { MaybePromise } from '@dxos/util';

import { ErrorComponentType } from '../components/ErrorBoundary';
import ClientProvider from './ClientProvider';

interface ClientInitializerProperties {
  children?: ReactNode
  config?: ClientConfig | (() => MaybePromise<ClientConfig>)
  errorComponent: React.ComponentType<ErrorComponentType>
}

/**
 * Initializes and provides a client instance given a config object or config generator.
 * To be used with `useClient` hook.
 */
const ClientInitializer = ({ children, config = {}, errorComponent }: ClientInitializerProperties) => {
  const [client, setClient] = useState<Client | undefined>();
  const [error, setError] = useState<undefined | Error>(undefined);
  useEffect(() => {
    const createClient = async () => {
      try {
        const client = new Client(typeof config === 'function' ? await config() : config);
        await client.initialize();
        setClient(client);
      } catch (error) {
        setError(error);
        console.error(error);
      }
    };
    setImmediate(createClient);
  }, []);

  const handleRestart = () => {
    window.location.reload();
  };

  const handleReset = async () => {
    if (client) {
      await client.reset();
    }
  };

  if (error) {
    const ErrorComponent = errorComponent;
    return (<ErrorComponent onRestart={handleRestart} onReset={handleReset} error={error} />);
  }

  if (!client) {
    return <LinearProgress />;
  }

  return (
    <ClientProvider client={client}>
      {children}
    </ClientProvider>
  );
};

export default ClientInitializer;
