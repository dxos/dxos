//
// Copyright 2021 DXOS.org
//

import { ApiPromise } from '@polkadot/api/promise';
import { KeyringPair } from '@polkadot/keyring/types';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import {
  AccountClient
} from '../../src';
import { setup } from './utils';

chai.use(chaiAsPromised);

describe('Accounts Client', () => {
  let apiPromise: ApiPromise;
  let accountsApi: AccountClient;
  let alice: KeyringPair;
  let bob: KeyringPair;

  beforeEach(async () => {
    const setupResult = await setup();
    apiPromise = setupResult.apiPromise;
    accountsApi = setupResult.accountsClient;
    alice = setupResult.alice;
    bob = setupResult.bob;
  });

  afterEach(async () => apiPromise.disconnect());

  describe('Creating accounts', () => {
    it('Can create a DXNS account', async () => {
      const account = await accountsApi.createAccount();

      const accountRecord = await accountsApi.getAccount(account);
      expect(accountRecord).to.not.be.undefined;
      expect(accountRecord?.id).to.eq(account.toHex());
      expect(accountRecord?.devices).to.deep.eq([alice.address]);
    });
  });

  describe('Adding devices', () => {
    it('Can add a second device', async () => {
      const account = await accountsApi.createAccount();
      expect(await accountsApi.isDeviceOfAccount(account, alice.address)).to.be.true;
      expect(await accountsApi.isDeviceOfAccount(account, bob.address)).to.be.false;

      await accountsApi.addDeviceToAccount(account, bob.address);
      expect(await accountsApi.isDeviceOfAccount(account, bob.address)).to.be.true;
    });
  });
});
