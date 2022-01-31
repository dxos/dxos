//
// Copyright 2021 DXOS.org
//

import { ApiPromise } from '@polkadot/api/promise';
import Keyring from '@polkadot/keyring';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import protobuf from 'protobufjs';

import {Client} from '@dxos/client'

import {
  App,
  IRegistryClient,
  CID,
  DomainKey,
  DXN,
  RegistryClient,
  createCID,
  createApiPromise,
  createKeyring,
  schemaJson,
  AuctionsClient,
  IAuctionsClient
} from '../../src';
import { DEFAULT_DOT_ENDPOINT } from './test-config';
import { KeyType } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';

chai.use(chaiAsPromised);

describe.only('Signatures', () => {
  let auctionsApi: IAuctionsClient;
  let client: Client
  let keypair: ReturnType<Keyring['addFromUri']>;
  let apiPromise: ApiPromise;

  beforeEach(async () => {
    apiPromise = await createApiPromise(DEFAULT_DOT_ENDPOINT);

    const keyring = await createKeyring();
    const config = { uri: '//Alice' };
    keypair = keyring.addFromUri(config.uri);

    client = new Client({runtime: {services: {dxns: {server: DEFAULT_DOT_ENDPOINT}}}})
    await client.initialize();
    await client.halo.createProfile();
    await client.halo.addKeyRecord({
      publicKey: PublicKey.from(keypair.publicKey),
      secretKey: Buffer.from(config.uri),
      type: KeyType.DXNS
    })

    auctionsApi = new AuctionsClient(apiPromise, keypair);
  });

  afterEach(async () => {
    await apiPromise.disconnect();
  });

  it('Can send transactions with external signer', async () => {
    const auctionName = Math.random().toString(36).substring(2);
    await expect(auctionsApi.createAuction(auctionName, 100000)).to.be.fulfilled;
  });
});
