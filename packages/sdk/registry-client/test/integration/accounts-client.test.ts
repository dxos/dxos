//
// Copyright 2021 DXOS.org
//

import { ApiPromise } from '@polkadot/api/promise';
import Keyring from '@polkadot/keyring';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import protobuf from 'protobufjs';
import { AccountClient } from 'sample-polkadotjs-typegen/accounts-client';

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
  schemaJson
} from '../../src';
import { DEFAULT_DOT_ENDPOINT } from './test-config';

chai.use(chaiAsPromised);

const protoSchema = protobuf.Root.fromJSON(schemaJson);

const randomName = () => {
  // Must start with a letter.
  return `r${Math.random().toString(36).substring(2)}`;
};

describe('Accounts Client', () => {
  let accountsApi: AccountClient;
  let keypair: ReturnType<Keyring['addFromUri']>;
  let apiPromise: ApiPromise;

  beforeEach(async () => {
    const keyring = await createKeyring();
    const config = { uri: '//Alice' };
    apiPromise = await createApiPromise(DEFAULT_DOT_ENDPOINT);
    keypair = keyring.addFromUri(config.uri);
    accountsApi = new AccountClient(apiPromise, keypair);
  });

  afterEach(async () => {
    await apiPromise.disconnect();
  });

  describe('', () => {
    it('Accounts and devices', async () => {
      const account = await accountsApi.createAccount();
      console.log({account})
    });
  });
});
