//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { BaseClient } from './base-client';
import { DxnsAccount, AccountKey } from './types';

/**
 * Main API for DXNS account and devices management.
 */
export class AccountClient extends BaseClient {
  /**
   * Creates a DXNS account on the blockchain.
   */
  async createAccount (): Promise<AccountKey> {
    const accountKey = AccountKey.random();
    const tx = this.api.tx.registry.createAccount(accountKey.value);
    const { events } = await this.transactionsHandler.sendTransaction(tx);
    const event = events.map(e => e.event).find(this.api.events.registry.AccountCreated.is);
    assert(event && this.api.events.registry.AccountCreated.is(event));
    return accountKey;
  }

  async getAccount (account: AccountKey): Promise<DxnsAccount | undefined> {
    const accountRecord = (await this.api.query.registry.accounts(account.value)).unwrapOr(undefined);
    if (!accountRecord) {
      return undefined;
    }
    return {
      devices: accountRecord.devices.map(device => device.toString()),
      id: account.toHex()
    };
  }

  async getAllAccounts (): Promise<DxnsAccount[]> {
    const accounts = await this.api.query.registry.accounts.entries();
    return accounts.map(accountRecord => {
      const deviceRecords = accountRecord[1].unwrap().devices;
      return {
        id: accountRecord[0].toHex(),
        devices: deviceRecords.map(device => device.toString())
      };
    });
  }

  /**
   * Add a new device to an existing DXNS account.
   */
  async addDeviceToAccount (account: AccountKey, device: string): Promise<void> {
    const tx = this.api.tx.registry.addDevice(account.value, device);
    await this.transactionsHandler.sendTransaction(tx);
  }

  /**
   * Is the given device a listed device of this DXNS account?
   */
  async isDeviceOfAccount (account: AccountKey, device: string): Promise<boolean> {
    const accountRecord = (await this.api.query.registry.accounts(account.value)).unwrap();
    return accountRecord.devices.includes(device);
  }
}
