//
// Copyright 2021 DXOS.org
//

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { defaultConfig, Client } from '@dxos/client';

import {
  AuctionsClient,
  createApiPromise,
  createKeyring,
  ClientSigner,
  ClientSignerAdapter,
  RegistryClient,
  SignTxFunction,
  PolkadotRegistry,
  AccountsClient,
  PolkadotAccounts,
  PolkadotAuctions
} from '../../src';
import { DEFAULT_DXNS_ENDPOINT } from './test-config';

chai.use(chaiAsPromised);

export const setupRegistryClient = async () => {
  // TODO(burdon): Factor out key management from client API.
  throw new Error('Not implemented');

  const apiPromise = await createApiPromise(DEFAULT_DXNS_ENDPOINT);

  // TODO(burdon): Change to array of accounts (are these special for testing?)
  const alice = (await createKeyring()).addFromUri('//Alice');
  const bob = (await createKeyring()).addFromUri('//Bob');

  const client = new Client(defaultConfig, {
    signer: new ClientSignerAdapter()
  });
  await client.initialize();
  // await client.halo.addKeyRecord({
  //   publicKey: PublicKey.from(decodeAddress(alice.address)),
  //   secretKey: Buffer.from('//Alice'),
  //   type: KeyType.DXNS_ADDRESS
  // });

  const signer = new ClientSigner(client, apiPromise.registry, alice.address);
  const signTx: SignTxFunction = (tx) => tx.signAsync(alice.address, { signer });

  const accountsBackend = new PolkadotAccounts(apiPromise, signTx);
  const accountsClient = new AccountsClient(accountsBackend);
  const auctionsBackend = new PolkadotAuctions(apiPromise, signTx);
  const auctionsClient = new AuctionsClient(auctionsBackend);
  const registryBackend = new PolkadotRegistry(apiPromise, signTx);
  const registryClient = new RegistryClient(registryBackend);

  return {
    alice,
    bob,
    apiPromise,
    accountsBackend,
    accountsClient,
    auctionsBackend,
    auctionsClient,
    registryBackend,
    registryClient
  };
};
