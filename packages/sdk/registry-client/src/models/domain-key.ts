//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import { randomBytes } from 'crypto';

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
    return new DomainKey(new Uint8Array(randomBytes(32)));
  }

  constructor (
    public readonly value: Uint8Array
  ) {
    assert(value.length === 32, 'Invalid domain key length.');
  }

  toHex () {
    return Buffer.from(this.value).toString('hex');
  }

  toString () {
    return this.toHex();
  }
}
