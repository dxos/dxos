//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { DxnsAccount, AccountKey } from './types';
import { BaseClient } from './base-client';

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

  /**
   * Add a new device to an existing DXNS account.
   */
  async addDeviceToAccount (account: string, device: string): Promise<void> {
    const tx = this.api.tx.registry.addDevice(account, device);
    await this.transactionsHandler.sendTransaction(tx);
  }

  /**
   * Is the given device a listed device of this DXNS account?
   */
  async isDeviceOfAccount (account: string, device: string): Promise<boolean> {
    const accountRecord = (await this.api.query.registry.accounts(account)).unwrap();
    return accountRecord.devices.includes(device);
  }
}
