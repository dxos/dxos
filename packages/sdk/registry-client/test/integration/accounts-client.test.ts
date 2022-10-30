//
// Copyright 2021 DXOS.org
//

import { ApiPromise } from '@polkadot/api/promise';
import { KeyringPair } from '@polkadot/keyring/types';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { AccountsClient } from '../../src';
import { setupRegistryClient } from './utils';

chai.use(chaiAsPromised);

describe('Accounts Client', function () {
  let apiPromise: ApiPromise;
  let accountsApi: AccountsClient;
  let alice: KeyringPair;
  let bob: KeyringPair;

  beforeEach(async function () {
    const setupResult = await setupRegistryClient();
    apiPromise = setupResult.apiPromise;
    accountsApi = setupResult.accountsClient;
    alice = setupResult.alice;
    bob = setupResult.bob;
  });

  afterEach(async function () {
    return apiPromise.disconnect();
  });

  describe('Creating accounts', function () {
    it('Can create a DXNS account', async function () {
      const account = await accountsApi.createAccount();

      const accountRecord = await accountsApi.getAccount(account);
      expect(accountRecord).to.not.be.undefined;
      expect(accountRecord?.id).to.eq(account.toHex());
      expect(accountRecord?.devices).to.deep.eq([alice.address]);
    });
  });

  describe('Adding devices', function () {
    it('Can add a second device', async function () {
      const account = await accountsApi.createAccount();
      expect(await accountsApi.belongsToAccount(account, alice.address)).to.be.true;
      expect(await accountsApi.belongsToAccount(account, bob.address)).to.be.false;

      await accountsApi.addDevice(account, bob.address);
      expect(await accountsApi.belongsToAccount(account, bob.address)).to.be.true;
    });
  });
});
