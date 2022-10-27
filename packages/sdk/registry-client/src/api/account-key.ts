//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';
import randomBytes from 'randombytes';

export const ACCOUNT_KEY_LENGTH = 32;

/**
 * Represents an account key.
 *
 * Account keys must conform to regex: /^[a-z0-9_]+$/.
 */
export class AccountKey {
  static fromHex(hexString: string): AccountKey {
    return new AccountKey(
      new Uint8Array(Buffer.from(hexString.startsWith('0x') ? hexString.slice(2) : hexString, 'hex'))
    );
  }

  static random(): AccountKey {
    return new AccountKey(new Uint8Array(randomBytes(ACCOUNT_KEY_LENGTH)));
  }

  static equals(left: AccountKey | string, right: AccountKey | string) {
    const leftKey = typeof left === 'string' ? AccountKey.fromHex(left) : left;
    const rightKey = typeof right === 'string' ? AccountKey.fromHex(right) : right;
    return leftKey.toString() === rightKey.toString();
  }

  constructor(public readonly value: Uint8Array) {
    assert(value.length === ACCOUNT_KEY_LENGTH, 'Invalid account key length.');
  }

  toHex() {
    return Buffer.from(this.value).toString('hex');
  }

  toString() {
    return this.toHex();
  }

  equals(other: AccountKey | string) {
    const otherKey = typeof other === 'string' ? AccountKey.fromHex(other) : other;
    return this.toString() === otherKey.toString();
  }
}
