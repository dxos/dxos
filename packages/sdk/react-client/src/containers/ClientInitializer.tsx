//
// Copyright 2020 DXOS.org
//

import React, { useState, useEffect, ReactNode, ErrorInfo } from 'react';

import { Client, ClientConfig } from '@dxos/client';
import { MaybePromise } from '@dxos/util';

import { ErrorComponentProps, ErrorBoundary, ErrorCallbackType } from '../components';
import { ClientProvider } from './ClientProvider';

interface ClientLoaderProps {
  children?: ReactNode
  config?: ClientConfig | (() => MaybePromise<ClientConfig>)
  onInit?: (client: Client) => void
  loaderComponent?: React.ComponentType
}

/**
 * Async initializer for the client component the defers rendering of children until complete.
 */
// TODO(burdon): Rename.
export const ClientLoader = ({
  children,
  config = {},
  onInit,
  loaderComponent: LoaderComponent
}: ClientLoaderProps) => {
  const [client, setClient] = useState<Client | undefined>();

  useEffect(() => {
    setImmediate(async () => {
      const client = new Client(typeof config === 'function' ? await config() : config);
      await client.initialize();
      setClient(client);
      onInit && onInit(client);
    });
  }, []);

  if (!client) {
    if (LoaderComponent) {
      return (
        <LoaderComponent/>
      );
    }

    return null;
  }

  return (
    <ClientProvider client={client}>
      {children}
    </ClientProvider>
  );
};

interface ClientInitializerProps {
  children?: ReactNode
  config?: ClientConfig | (() => MaybePromise<ClientConfig>)
  onError?: ErrorCallbackType
  errorComponent?: React.ComponentType<ErrorComponentProps>
  loaderComponent?: React.ComponentType
}

/**
 * Async initializer for the client component the defers rendering of children until complete,
 * incorporating a top-level ErrorBoundary.
 */
// TODO(burdon): Rename.
export const ClientInitializer = ({
  children,
  config = {},
  onError,
  errorComponent: ErrorComponent,
  loaderComponent: LoaderComponent
}: ClientInitializerProps) => {
  const [client, setClient] = useState<Client | undefined>();

  // TODO(burdon): Global error handling?
  // It's important to print the error to the console here so sentry can report it.
  const handleError = (error: Error, errorInfo?: ErrorInfo) => {
    console.error(error, errorInfo);
    if (onError) {
      onError(error, errorInfo);
    }
  };

  const handleRestart = () => {
    window.location.reload();
  };

  // TODO(burdon): Debug only? "Are you sure?" warning?
  const handleReset = async () => {
    if (client) {
      await client.reset();
    }
  };

  return (
    <ErrorBoundary
      onError={handleError}
      onRestart={handleRestart}
      onReset={handleReset}
      errorComponent={ErrorComponent}
    >
      <ClientLoader
        config={config}
        loaderComponent={LoaderComponent}
        onInit={setClient}
      >
        {children}
      </ClientLoader>
    </ErrorBoundary>
  );
};
