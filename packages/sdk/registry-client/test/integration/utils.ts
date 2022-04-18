//
// Copyright 2021 DXOS.org
//

import { decodeAddress } from '@polkadot/util-crypto';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { Client } from '@dxos/client';
import { KeyType } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';

import {
  AccountClient,
  AuctionsClient,
  createApiPromise,
  createKeyring,
  ClientSigner,
  ClientSignerPlugin,
  RegistryClient,
  SignTxFunction
} from '../../src';
import { DEFAULT_DOT_ENDPOINT } from './test-config';

chai.use(chaiAsPromised);

export const setup = async () => {
  const apiPromise = await createApiPromise(DEFAULT_DOT_ENDPOINT);

  const alice = (await createKeyring()).addFromUri('//Alice');
  const bob = (await createKeyring()).addFromUri('//Bob');

  const client = new Client({}, {
    signer: new ClientSignerPlugin()
  });
  await client.initialize();
  await client.halo.addKeyRecord({
    publicKey: PublicKey.from(decodeAddress(alice.address)),
    secretKey: Buffer.from('//Alice'),
    type: KeyType.DXNS_ADDRESS
  });

  const signer = new ClientSigner(client, apiPromise.registry, alice.address);
  const signTx: SignTxFunction = tx => tx.signAsync(alice.address, { signer });

  const accountsApi = new AccountClient(apiPromise, signTx);
  const auctionsApi = new AuctionsClient(apiPromise, signTx);
  const registryApi = new RegistryClient(apiPromise, signTx);

  return {
    alice,
    bob,
    apiPromise,
    accountsApi,
    auctionsApi,
    registryApi
  };
};
