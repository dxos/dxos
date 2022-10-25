//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import React, { useState, useEffect, ReactNode } from 'react';

import { ConfigProvider } from '@dxos/config';
import { RegistryClient } from '@dxos/registry-client';

import { RegistryContext } from '../hooks';
import { createRegistryContext } from './config';

const log = debug('dxos:react-registry-client:error');

interface RegistryProviderProps {
  config?: ConfigProvider;
  registry?: RegistryClient;
  children?: ReactNode;
}

/**
 * Initializes and provides a DXNS registry instance given a config object or config generator.
 * To be used with `useRegistry` hook.
 */
export const RegistryProvider = ({ config = {}, registry, children }: RegistryProviderProps) => {
  const [context, setContext] = useState<RegistryContext | undefined>(registry && { registry });
  const [error, setError] = useState<undefined | Error>(undefined);
  if (error) {
    log(error);
    throw error; // Should be caught by ErrorBoundary.
  }

  useEffect(() => {
    if (!registry) {
      setTimeout(async () => {
        try {
          const context = await createRegistryContext(config);
          setContext(context);
        } catch (err: any) {
          setError(err);
        }
      });
    }
  }, []);

  // Still loading.
  if (!context) {
    return null;
  }

  return <RegistryContext.Provider value={context}>{children}</RegistryContext.Provider>;
};

/**
 * @deprecated
 */
export const RegistryInitializer = ({ children, config = {} }: RegistryProviderProps) => (
  <RegistryProvider config={config}>{children}</RegistryProvider>
);
