//
// Copyright 2021 DXOS.org
//

import { ApiPromise } from '@polkadot/api/promise';
import Keyring from '@polkadot/keyring';
import { KeyringPair } from '@polkadot/keyring/types';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {
  AccountClient, createApiPromise,
  createKeyring
} from '../../src';
import { DEFAULT_DOT_ENDPOINT } from './test-config';

chai.use(chaiAsPromised);

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

  describe('Creating accounts', () => {
    it('Can create a DXNS account', async () => {
      const account = await accountsApi.createAccount();

      const accountRecord = await accountsApi.getAccount(account);
      expect(accountRecord).to.not.be.undefined;
      expect(accountRecord?.id).to.eq(account.toHex());
      expect(accountRecord?.devices).to.deep.eq([keypair.address]);
    });
  });

  describe('Adding devices', () => {
    let bob: KeyringPair;
    before(async () => {
      const bobKeyring = await createKeyring();
      bob = bobKeyring.addFromUri('//Bob');
    });

    it('Can add a second device', async () => {
      const account = await accountsApi.createAccount();
      expect(await accountsApi.isDeviceOfAccount(account, keypair.address)).to.be.true;
      expect(await accountsApi.isDeviceOfAccount(account, bob.address)).to.be.false;

      await accountsApi.addDeviceToAccount(account, bob.address);
      expect(await accountsApi.isDeviceOfAccount(account, bob.address)).to.be.true;
    });
  });
});
