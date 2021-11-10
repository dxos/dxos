//
// Copyright 2020 DXOS.org
//

import React, { useState, useEffect, ReactNode, ErrorInfo } from 'react';

import { Client, ClientConstructorOpts } from '@dxos/client';

import { ErrorComponentProps, ErrorBoundary, ErrorCallbackType } from '../components';
import { SuppliedConfig, unwrapConfig } from '../config';
import { ClientProvider } from './ClientProvider';

interface ClientLoaderProps {
  children?: ReactNode
  config?: SuppliedConfig
  clientOpts?: ClientConstructorOpts
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
  clientOpts,
  onInit,
  loaderComponent: LoaderComponent
}: ClientLoaderProps) => {
  const [client, setClient] = useState<Client | undefined>();

  useEffect(() => {
    setImmediate(async () => {
      const client = new Client(await unwrapConfig(config), clientOpts);
      await client.initialize();
      setClient(client);
      onInit && onInit(client);
    });
  }, []);

  if (!client) {
    if (LoaderComponent) {
      return (
        <LoaderComponent />
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
  config?: SuppliedConfig,
  clientOpts?: ClientConstructorOpts
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
  clientOpts,
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
        clientOpts={clientOpts}
        loaderComponent={LoaderComponent}
        onInit={setClient}
      >
        {children}
      </ClientLoader>
    </ErrorBoundary>
  );
};
