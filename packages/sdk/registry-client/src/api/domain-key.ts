//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';
import randomBytes from 'randombytes';

export const DOMAIN_KEY_LENGTH = 32;

/**
 * Represents a domain key.
 *
 * Domains must conform to regex: /^[a-z0-9_]+$/.
 */
export class DomainKey {
  static fromHex (hexString: string): DomainKey {
    return new DomainKey(new Uint8Array(Buffer.from(hexString, 'hex')));
  }

  static random (): DomainKey {
    return new DomainKey(new Uint8Array(randomBytes(DOMAIN_KEY_LENGTH)));
  }

  constructor (
    public readonly value: Uint8Array
  ) {
    assert(value.length === DOMAIN_KEY_LENGTH, 'Invalid domain key length.');
  }

  toHex () {
    return Buffer.from(this.value).toString('hex');
  }

  toString () {
    return this.toHex();
  }
}
