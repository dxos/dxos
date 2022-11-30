//
// Copyright 2021 DXOS.org
//

import { ApiPromise } from '@polkadot/api/promise';
import { KeyringPair } from '@polkadot/keyring/types';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { afterEach, beforeEach, describe, test } from '@dxos/test';

import { AccountsClient } from '../../src';
import { setupRegistryClient } from './utils';

chai.use(chaiAsPromised);

describe('Accounts Client', () => {
  let apiPromise: ApiPromise;
  let accountsApi: AccountsClient;
  let alice: KeyringPair;
  let bob: KeyringPair;

  beforeEach(async () => {
    const setupResult = await setupRegistryClient();
    apiPromise = setupResult.apiPromise;
    accountsApi = setupResult.accountsClient;
    alice = setupResult.alice;
    bob = setupResult.bob;
  });

  afterEach(async () => apiPromise.disconnect());

  describe('Creating accounts', () => {
    test('Can create a DXNS account', async () => {
      const account = await accountsApi.createAccount();

      const accountRecord = await accountsApi.getAccount(account);
      expect(accountRecord).to.not.be.undefined;
      expect(accountRecord?.id).to.eq(account.toHex());
      expect(accountRecord?.devices).to.deep.eq([alice.address]);
    });
  });

  describe('Adding devices', () => {
    test('Can add a second device', async () => {
      const account = await accountsApi.createAccount();
      expect(await accountsApi.belongsToAccount(account, alice.address)).to.be.true;
      expect(await accountsApi.belongsToAccount(account, bob.address)).to.be.false;

      await accountsApi.addDevice(account, bob.address);
      expect(await accountsApi.belongsToAccount(account, bob.address)).to.be.true;
    });
  });
});
