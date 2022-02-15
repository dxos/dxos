//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { randomBytes } from '@dxos/crypto';

export const ACCOUNT_KEY_LENGTH = 32;

/**
 * Represents an account key.
 *
 * Account keys must conform to regex: /^[a-z0-9_]+$/.
 */
export class AccountKey {
  static fromHex (hexString: string): AccountKey {
    return new AccountKey(new Uint8Array(Buffer.from(hexString, 'hex')));
  }

  static random (): AccountKey {
    return new AccountKey(new Uint8Array(randomBytes(ACCOUNT_KEY_LENGTH)));
  }

  constructor (
    public readonly value: Uint8Array
  ) {
    assert(value.length === ACCOUNT_KEY_LENGTH, 'Invalid account key length.');
  }

  toHex () {
    return Buffer.from(this.value).toString('hex');
  }

  toString () {
    return this.toHex();
  }
}
