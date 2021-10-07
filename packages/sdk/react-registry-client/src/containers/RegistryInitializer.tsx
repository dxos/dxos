//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import React, { useState, useEffect, ReactNode } from 'react';

import { createApiPromise, createKeyring, RegistryClient } from '@dxos/registry-client';
import { MaybePromise } from '@dxos/util';

import RegistryProvider from './RegistryProvider';

// TODO(burdon): Just provide minimal local config (don't infect with global config).
interface RegistryClientConfig {
  services?: {
    dxns? : {
      server: string,
      uri?: string
    }
  }
}

const log = debug('dxos:react-registry-client:error');

// TODO(burdon): Util.
type AsyncProvider<T> = T | (() => MaybePromise<T>);
const resolveAsyncProvider = async <T extends any>(provider: AsyncProvider<T>): Promise<T> => {
  return (typeof provider === 'function') ? await (provider as CallableFunction)() : provider;
}

type ConfigProvier = AsyncProvider<RegistryClientConfig>;

/**
 *
 */
// TODO(burdon): Move to registry-client?
const createRegistryClient = async (configProvider: ConfigProvier) => {
  const config = await resolveAsyncProvider(configProvider);
  if (!config.services?.dxns) {
    throw new Error('Config missing DXNS endpoint');
  }

  const keyring = await createKeyring();
  let keypair: ReturnType<typeof keyring['addFromUri']> | undefined;
  if (config.services.dxns.uri) {
    keypair = keyring.addFromUri(config.services.dxns.uri);
  }

  const apiPromise = await createApiPromise(config.services.dxns.server);
  return new RegistryClient(apiPromise, keypair);
};

interface RegistryInitializerProperties {
  children?: ReactNode
  config?: ConfigProvier
}

/**
 * Initializes and provides a DXNS registry instance given a config object or config generator.
 * To be used with `useRegistry` hook.
 * @deprecated
 */
// TODO(burdon): Merge with RegistryProvider or require client to create before rendering.
// TODO(burdon): Could be multiple things that require async bootstrap.
// E.g., <RegistryProvider registry={() => createRegistryClient(config)}>
const RegistryInitializer = ({ children, config = {} }: RegistryInitializerProperties) => {
  const [registry, setRegistry] = useState<RegistryClient | undefined>();
  const [error, setError] = useState<undefined | Error>(undefined);

  useEffect(() => {
    setImmediate(async () => {
      try {
        setRegistry(await createRegistryClient(config));
      } catch (error: any) {
        setError(error);
      }
    });
  }, []);

  // TODO(burdon): Error boundary?
  if (error) {
    log(error);
    throw error;
  }

  // Still loading.
  if (!registry) {
    return null;
  }

  return (
    <RegistryProvider registry={registry}>
      {children}
    </RegistryProvider>
  );
};

export default RegistryInitializer;
