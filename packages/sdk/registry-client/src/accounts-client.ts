//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { DxnsAccount } from '.';
import { BaseClient } from './base-client';

/**
 * Main API for DXNS account and devices management.
 */
export class AccountClient extends BaseClient {
  /**
   * Creates a DXNS account on the blockchain.
   */
  async createAccount (): Promise<string> {
    const tx = this.api.tx.registry.createAccount();
    const { events } = await this.transactionsHandler.sendTransaction(tx);
    const event = events.map(e => e.event).find(this.api.events.registry.AccountCreated.is);
    assert(event && this.api.events.registry.AccountCreated.is(event));
    return event.data[0].toString();
  }

  async getAccount (account: string): Promise<DxnsAccount | undefined> {
    const accountRecord = (await this.api.query.registry.accounts(account)).unwrapOr(undefined);
    if (!accountRecord) {
      return undefined;
    }
    return {
      devices: accountRecord.devices.map(device => device.toString()),
      id: accountRecord.id.toString()
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
