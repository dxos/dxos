//
// Copyright 2021 DXOS.org
//

import { decodeAddress } from '@polkadot/util-crypto';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { Client, defaultConfig } from '@dxos/client';
import { KeyType } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';

import {
  AccountClient,
  AuctionsClient,
  createApiPromise,
  createKeyring,
  ClientSigner,
  ClientSignerAdapter,
  RegistryClient,
  SignTxFunction,
  PolkadotRegistryClientBackend
} from '../../src';
import { DEFAULT_DXNS_ENDPOINT } from './test-config';

chai.use(chaiAsPromised);

export const setup = async () => {
  const apiPromise = await createApiPromise(DEFAULT_DXNS_ENDPOINT);

  // TODO(burdon): Change to array of accounts (are these special for testing?)
  const alice = (await createKeyring()).addFromUri('//Alice');
  const bob = (await createKeyring()).addFromUri('//Bob');

  const client = new Client(defaultConfig, {
    signer: new ClientSignerAdapter()
  });
  await client.initialize();
  await client.halo.addKeyRecord({
    publicKey: PublicKey.from(decodeAddress(alice.address)),
    secretKey: Buffer.from('//Alice'),
    type: KeyType.DXNS_ADDRESS
  });

  const signer = new ClientSigner(client, apiPromise.registry, alice.address);
  const signTx: SignTxFunction = tx => tx.signAsync(alice.address, { signer });

  const accountsClient = new AccountClient(apiPromise, signTx);
  const auctionsClient = new AuctionsClient(apiPromise, signTx);
  const registryClient = new RegistryClient(new PolkadotRegistryClientBackend(apiPromise, signTx));

  return {
    alice,
    bob,
    apiPromise,
    accountsClient,
    auctionsClient,
    registryClient
  };
};
