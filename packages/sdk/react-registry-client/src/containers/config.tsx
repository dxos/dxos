//
// Copyright 2020 DXOS.org
//

import { createApiPromise, createKeyring, RegistryClient } from '@dxos/registry-client';
import { MaybePromise } from '@dxos/util';

// TODO(burdon): Move to @dxos/util.
type AsyncProvider<T> = T | (() => MaybePromise<T>);
const resolveAsyncProvider = async <T, >(provider: AsyncProvider<T>): Promise<T> => {
  return (typeof provider === 'function') ? await (provider as CallableFunction)() : provider;
};

// TODO(burdon): Get from global config definition?
interface RegistryClientConfig {
  services?: {
    dxns? : {
      server: string, // TODO(burdon): Required.
      uri?: string
    }
  }
}

export type RegistryConfigProvider = AsyncProvider<RegistryClientConfig>

export const createRegistryClient = async (configProvider: RegistryConfigProvider) => {
  const config = await resolveAsyncProvider(configProvider);
  if (!config.services?.dxns) {
    throw new Error('Config missing DXNS endpoint.');
  }

  const keyring = await createKeyring();
  let keypair: ReturnType<typeof keyring['addFromUri']> | undefined;
  if (config.services.dxns.uri) {
    keypair = keyring.addFromUri(config.services.dxns.uri);
  }

  const apiPromise = await createApiPromise(config.services.dxns.server);
  return new RegistryClient(apiPromise, keypair);
};
