//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import React, { useState, useEffect, ReactNode } from 'react';

import { IRegistryClient } from '@dxos/registry-client';

import { RegistryContext } from '../hooks';
import { createRegistryContext, RegistryConfigProvider } from './config';

const log = debug('dxos:react-registry-client:error');

interface RegistryProviderProps {
  children?: ReactNode | ReactNode[]
  config?: RegistryConfigProvider
  registry?: IRegistryClient
}

/**
 * Initializes and provides a DXNS registry instance given a config object or config generator.
 * To be used with `useRegistry` hook.
 */
export const RegistryProvider = ({ children, config = {}, registry }: RegistryProviderProps) => {
  const [value, setValue] = useState<RegistryContext | undefined>(registry && { registry });
  const [error, setError] = useState<undefined | Error>(undefined);
  if (error) {
    log(error);
    throw error; // Should be caught by ErrorBoundary.
  }

  useEffect(() => {
    if (!registry) {
      setImmediate(async () => {
        try {
          setValue(await createRegistryContext(config));
        } catch (error: any) {
          setError(error);
        }
      });
    }
  }, []);

  // Still loading.
  if (!value) {
    return null;
  }

  return (
    <RegistryContext.Provider value={value}>
      {children}
    </RegistryContext.Provider>
  );
};

/**
 * @deprecated
 */
export const RegistryInitializer = ({ children, config = {} }: RegistryProviderProps) => {
  return (
    <RegistryProvider config={config}>
      {children}
    </RegistryProvider>
  );
};
