//
// Copyright 2020 DXOS.org
//

import React, { useState, useEffect, ReactNode } from 'react';

import { LinearProgress } from '@material-ui/core';

import { Client, ClientConfig } from '@dxos/client';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { MaybePromise } from '@dxos/util';

import ClientProvider from './ClientProvider';

interface ClientInitializerProperties {
  children?: ReactNode
  config?: ClientConfig | (() => MaybePromise<ClientConfig>)
}

/**
 * Initializes and provides a client instance given a config object or config generator.
 * To be used with `useClient` hook.
 */
const ClientInitializer = ({ children, config = {} }: ClientInitializerProperties) => {
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

  if (!client) {
    return <LinearProgress />;
  }

  return (
    <ErrorBoundary
      // It's important to print the error to the console here so sentry can report it.
      onError={console.error}
      onRestart={handleRestart}
      onReset={handleReset}
    >
      <ClientProvider client={client}>
        {children}
      </ClientProvider>
    </ErrorBoundary>
  );
};

export default ClientInitializer;
