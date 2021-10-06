//
// Copyright 2020 DXOS.org
//

import React, { useState, useEffect, ReactNode } from 'react';

import { createApiPromise, createKeyring, RegistryClient } from '@dxos/registry-client';
import { MaybePromise } from '@dxos/util';

import RegistryProvider from './RegistryProvider';

interface RegistryClientConfig {
  services?: {
    dxns? : {
      server: string,
      uri?: string
    }
  }
}

interface RegistryInitializerProperties {
  children?: ReactNode
  config?: RegistryClientConfig | (() => MaybePromise<RegistryClientConfig>)
}

/**
 * Initializes and provides a DXNS registry instance given a config object or config generator.
 * To be used with `useRegistry` hook.
 */
const RegistryInitializer = ({ children, config = {} }: RegistryInitializerProperties) => {
  const [registry, setRegistry] = useState<RegistryClient | undefined | null>(null);
  const [error, setError] = useState<undefined | Error>(undefined);

  useEffect(() => {
    setImmediate(async () => {
      const resolvedConfig = typeof config === 'function' ? await config() : config;
      if (!resolvedConfig.services?.dxns) {
        console.warn('RegistryInitializer is used but no `config.services.dxns` provided.');
        setRegistry(undefined);
        return;
      }
      try {
        const keyring = await createKeyring();
        let keypair: ReturnType<typeof keyring['addFromUri']> | undefined;
        if (resolvedConfig.services.dxns.uri) {
          keypair = keyring.addFromUri(resolvedConfig.services.dxns.uri);
        }
        const apiPromise = await createApiPromise(resolvedConfig.services.dxns.server);
        setRegistry(new RegistryClient(apiPromise, keypair));
      } catch (error: any) {
        setError(error);
      }
    });
  }, []);

  if (error) {
    throw error;
  }

  if (registry === null) {
    // Still loading.
    return null;
  }

  return (
      <RegistryProvider registry={registry}>
        {children}
      </RegistryProvider>
  );
};

export default RegistryInitializer;
