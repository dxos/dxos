//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';

import { Account, AccountKey, AccountsClientBackend } from '../api/index.js';
import { PolkadotClient } from './polkadot-client.js';

/**
 * Polkadot DXNS accounts client backend.
 */
export class PolkadotAccounts extends PolkadotClient implements AccountsClientBackend {
  async getAccount (account: AccountKey): Promise<Account | undefined> {
    const accountRecord = (await this.api.query.registry.accounts(account.value)).unwrapOr(undefined);
    if (!accountRecord) {
      return undefined;
    }

    return {
      devices: accountRecord.devices.map(device => device.toString()),
      id: account.toHex()
    };
  }

  async listAccounts (): Promise<Account[]> {
    const accounts = await this.api.query.registry.accounts.entries();

    return accounts.map(accountRecord => {
      const deviceRecords = accountRecord[1].unwrap().devices;
      return {
        id: accountRecord[0].toHex(),
        devices: deviceRecords.map(device => device.toString())
      };
    });
  }

  async createAccount (): Promise<AccountKey> {
    const accountKey = AccountKey.random();
    const tx = this.api.tx.registry.createAccount(accountKey.value);
    const { events } = await this.transactionsHandler.sendTransaction(tx);
    const event = events.map(e => e.event).find(this.api.events.registry.AccountCreated.is);
    assert(event && this.api.events.registry.AccountCreated.is(event));

    return accountKey;
  }

  async addDevice (account: AccountKey, device: string): Promise<void> {
    const tx = this.api.tx.registry.addDevice(account.value, device);
    await this.transactionsHandler.sendTransaction(tx);
  }

  async belongsToAccount (account: AccountKey, device: string): Promise<boolean> {
    const accountRecord = (await this.api.query.registry.accounts(account.value)).unwrap();

    return accountRecord.devices.includes(device);
  }
}
