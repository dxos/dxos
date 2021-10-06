//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import React, { useState, useEffect, ReactNode } from 'react';

import { createApiPromise, createKeyring, RegistryClient } from '@dxos/registry-client';
import { MaybePromise } from '@dxos/util';

import RegistryProvider from './RegistryProvider';

// TODO(burdon): Reference master config object.
interface RegistryClientConfig {
  services?: {
    dxns? : {
      server: string,
      uri?: string
    }
  }
}

const log = debug('dxos:react-registry-client:error');

type ConfigProvier = RegistryClientConfig | (() => MaybePromise<RegistryClientConfig>);

const createRegistryClient = async (config: ConfigProvier) => {
  const resolvedConfig = (typeof config === 'function') ? await config() : config;
  if (!resolvedConfig.services?.dxns) {
    throw new Error('Config missing DXNS endpoint');
  }

  const keyring = await createKeyring();
  let keypair: ReturnType<typeof keyring['addFromUri']> | undefined;
  if (resolvedConfig.services.dxns.uri) {
    keypair = keyring.addFromUri(resolvedConfig.services.dxns.uri);
  }

  const apiPromise = await createApiPromise(resolvedConfig.services.dxns.server);
  return new RegistryClient(apiPromise, keypair);
};

// TODO(burdon): Storybook.
// TODO(burdon): Generic loader.

// interface LoaderProperties<T> {
//   children: ReactNode
//   initializer: () => Promise<T>
// }

// const Loader = async <T extends any>({ children, initializier }: LoaderProperties<T>) => {
//   const [value, setValue] = useState<T>();
//   const [error, setError] = useState<undefined | Error>(undefined);
// }

interface RegistryInitializerProperties {
  children?: ReactNode
  config?: ConfigProvier
}

/**
 * Initializes and provides a DXNS registry instance given a config object or config generator.
 * To be used with `useRegistry` hook.
 * @deprecated
 */
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
