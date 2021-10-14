//
// Copyright 2020 DXOS.org
//

import React, { useState, useEffect, ReactNode, ErrorInfo } from 'react';

import { Client, ClientConfig } from '@dxos/client';
import { MaybePromise } from '@dxos/util';

import { ErrorComponentProps, ErrorBoundary, ErrorCallbackType } from '../components';
import ClientProvider from './ClientProvider';

interface ClientInitializerProps {
  children?: ReactNode
  config?: ClientConfig | (() => MaybePromise<ClientConfig>)
  errorComponent?: React.ComponentType<ErrorComponentProps>,
  loaderComponent?: React.ComponentType,
  onError?: ErrorCallbackType
}

/**
 * Initializes and provides a client instance given a config object or config generator.
 * To be used with `useClient` hook.
 */
const ClientInitializer = ({
  children,
  config = {},
  errorComponent,
  loaderComponent: LoaderComponent,
  onError
}: ClientInitializerProps) => {
  const [client, setClient] = useState<Client | undefined>();
  const [error, setError] = useState<undefined | Error>(undefined);

  const handleError = (error: Error, errorInfo?: ErrorInfo) => {
    console.error(error, errorInfo);
    if (onError) {
      onError(error, errorInfo);
    }
  };

  useEffect(() => {
    const createClient = async () => {
      try {
        const client = new Client(typeof config === 'function' ? await config() : config);
        await client.initialize();
        setClient(client);
      } catch (error) {
        setError(error);
        console.error(error);
        handleError(error);
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

  if (error && errorComponent) {
    const ErrorComponent = errorComponent;
    return (<ErrorComponent onRestart={handleRestart} onReset={handleReset} error={error} />);
  }

  if (!client) {
    if (LoaderComponent) {
      return (<LoaderComponent />);
    }

    return null;
  }

  return (
    <ErrorBoundary
      // It's important to print the error to the console here so sentry can report it.
      onError={handleError}
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
