//
// Copyright 2021 DXOS.org
//

import { AccountKey } from './account-key';

/**
 * Accounts with a list of devices.
 */
export interface Account {
  id: string
  devices: string[]
}

export interface AccountsClientBackend {
  getAccount(account: AccountKey): Promise<Account | undefined>
  listAccounts(): Promise<Account[]>
  createAccount(): Promise<AccountKey>
  addDevice(account: AccountKey, device: string): Promise<void>
  belongsToAccount(account: AccountKey, device: string): Promise<boolean>
}
