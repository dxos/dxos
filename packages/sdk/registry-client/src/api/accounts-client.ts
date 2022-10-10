//
// Copyright 2022 DXOS.org
//

import { AccountKey } from './account-key.js';
import { AccountsClientBackend, Account } from './accounts.js';

/**
 * Main API for DXNS account and devices management.
 */
export class AccountsClient {
  constructor (
    private readonly _backend: AccountsClientBackend
  ) {}

  /**
   * Get the account details.
   */
  async getAccount (account: AccountKey): Promise<Account | undefined> {
    return this._backend.getAccount(account);
  }

  /**
   * List accounts in the system.
   */
  async listAccounts (): Promise<Account[]> {
    return this._backend.listAccounts();
  }

  /**
   * Creates a DXNS account on the blockchain.
   */
  async createAccount (): Promise<AccountKey> {
    return this._backend.createAccount();
  }

  /**
   * Add a new device to an existing DXNS account.
   */
  async addDevice (account: AccountKey, device: string): Promise<void> {
    await this._backend.addDevice(account, device);
  }

  /**
   * Is the given device a listed device of this DXNS account?
   */
  async belongsToAccount (account: AccountKey, device: string): Promise<boolean> {
    return this._backend.belongsToAccount(account, device);
  }
}
