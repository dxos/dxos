//
// Copyright 2021 DXOS.org
//

import { ApiPromise, WsProvider } from '@polkadot/api';
import Keyring from '@polkadot/keyring';
import { KeyringOptions } from '@polkadot/keyring/types';
import jsonrpc from '@polkadot/types/interfaces/jsonrpc';
import { RegistryTypes } from '@polkadot/types/types';
import { cryptoWaitReady } from '@polkadot/util-crypto';

import * as definitions from './interfaces/definitions';

const registryTypes: RegistryTypes =
    Object
      .values(definitions)
      .reduce((res: any, { types }: any): object => ({ ...res, ...types }), {}) as unknown as RegistryTypes;

export async function createKeyring (options?: KeyringOptions): Promise<Keyring> {
  // The keyring need to be created AFTER api is created or we need to wait for WASM init.
  // https://polkadot.js.org/docs/api/start/keyring#creating-a-keyring-instance
  await cryptoWaitReady();
  return new Keyring(options ?? { type: 'sr25519' });
}

/**
 * Creates an API primitive that holds connection, transaction and querying of substrate node.
 *
 * @param endpoint URI of the substrate node.
 */
export async function createApiPromise (endpoint: string) {
  const provider = new WsProvider(endpoint);
  return await new ApiPromise({ provider, types: registryTypes, rpc: jsonrpc }).isReady;
}
