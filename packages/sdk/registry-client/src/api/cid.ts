//
// Copyright 2021 DXOS.org
//

import { fromB58String, toB58String } from 'multihashes';
import assert from 'node:assert';
import { inspect } from 'node:util';

import { Multihash } from '../polkadot/interfaces/index.js';

/**
 * Conten-addressable ID.
 * https://docs.ipfs.io/concepts/content-addressing
 */
export class CID {
  static fromB58String (str: string): CID {
    return new CID(fromB58String(str));
  }

  // eslint-disable-next-line no-use-before-define
  static from (value: CIDLike): CID {
    if (value instanceof Uint8Array) {
      return new CID(value);
    } else if (typeof value === 'string') {
      return CID.fromB58String(value);
    } else if (value instanceof CID) {
      return value;
    } else {
      throw new Error('Invalid CID source.');
    }
  }

  constructor (
    public readonly value: Uint8Array
  ) {
    assert(value.length === 34, 'Invalid CID length.');
  }

  equals (other: CIDLike) {
    return Buffer.from(this.value).equals(Buffer.from(CID.from(other).value));
  }

  toB58String () {
    return toB58String(this.value);
  }

  toString () {
    return this.toB58String();
  }

  [inspect.custom] () {
    return this.toB58String();
  }
}

export type CIDLike = CID | Uint8Array | Multihash | string
