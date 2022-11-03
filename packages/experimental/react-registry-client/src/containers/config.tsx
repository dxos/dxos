//
// Copyright 2020 DXOS.org
//

import { Config, ConfigProvider } from '@dxos/config';
import {
  AccountsClient,
  createApiPromise,
  PolkadotAccounts,
  PolkadotRegistry,
  RegistryClient,
  SignTxFunction
} from '@dxos/registry-client';
import { getAsyncValue } from '@dxos/util';

import { RegistryContext } from '../hooks';

export const createRegistryContext = async (
  configProvider: ConfigProvider,
  signFn?: SignTxFunction
): Promise<RegistryContext> => {
  const configValue = await getAsyncValue(configProvider);
  const config = configValue instanceof Config ? configValue : new Config(configValue);
  const server = config.values.runtime?.services?.dxns?.server;
  if (!server) {
    throw new Error('Missing DXNS endpoint.');
  }

  const apiPromise = await createApiPromise(server);
  const registry = new RegistryClient(new PolkadotRegistry(apiPromise, signFn));
  const accounts = new AccountsClient(new PolkadotAccounts(apiPromise, signFn));

  return {
    registry,
    accounts
  };
};
