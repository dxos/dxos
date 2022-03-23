//
// Copyright 2020 DXOS.org
//

import { Config, ConfigProvider } from '@dxos/config';
import { AccountClient, createApiPromise, RegistryClient, SignTxFunction } from '@dxos/registry-client';
import { getAsyncValue } from '@dxos/util';

import { RegistryContext } from '../hooks';

export const createRegistryContext = async (
  configProvider: ConfigProvider,
  signFn?: SignTxFunction
): Promise<RegistryContext> => {
  const configValue = await getAsyncValue(configProvider);
  const config = (configValue instanceof Config) ? configValue : new Config(configValue);
  const server = config.values.runtime?.services?.dxns?.server;
  if (!server) {
    throw new Error('Missing DXNS endpoint.');
  }

  const apiPromise = await createApiPromise(server);
  const registry = new RegistryClient(apiPromise, signFn);
  const accounts = new AccountClient(apiPromise, signFn);

  return {
    registry,
    accounts
  };
};
