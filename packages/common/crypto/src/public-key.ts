//
// Copyright 2020 DXOS.org
//

import crypto from 'hypercore-crypto';
import { inspect } from 'util';

import { HumanHasher } from './human-hash';

export class PublicKey {
  /**
   * Creates new instance of PublicKey automatically determining the input format.
   */
  static from (source: PublicKeyLike): PublicKey {
    if (source instanceof PublicKey) {
      return source;
    } else if (source instanceof Buffer) {
      return new PublicKey(new Uint8Array(source));
    } else if (source instanceof Uint8Array) {
      return new PublicKey(source);
    } else if (typeof source === 'string') {
      return PublicKey.fromHex(source);
    } else if ((<any>source).asUint8Array) {
      return new PublicKey((<any>source).asUint8Array());
    } else {
      throw new TypeError(`Unable to create PublicKey from ${source}`);
    }
  }

  /**
   * Creates new instance of PublicKey from hex string.
   */
  static fromHex (hex: string) {
    if (hex.startsWith('0x')) {
      hex = hex.slice(2);
    }

    return new PublicKey(new Uint8Array(Buffer.from(hex, 'hex')));
  }

  static random (): PublicKey {
    return PublicKey.from(crypto.randomBytes(32));
  }

  /**
   * Tests if provided values is an instance of PublicKey.
   */
  static isPublicKey (value: any): value is PublicKey {
    return value instanceof PublicKey;
  }

  /**
   * Asserts that provided values is an instance of PublicKey.
   */
  static assertValidPublicKey (value: any): asserts value is PublicKey {
    if (!this.isPublicKey(value)) {
      throw new TypeError('Invalid PublicKey');
    }
  }

  /**
   * Tests two keys for equality.
   */
  static equals (left: PublicKeyLike, right: PublicKeyLike) {
    return PublicKey.from(left).equals(right);
  }

  constructor (
    private readonly _value: Uint8Array
  ) {
    if (!(_value instanceof Uint8Array)) {
      throw new TypeError(`Expected Uint8Array, got: ${_value}`);
    }
  }

  /**
   * Return underlying Uint8Array representation.
   */
  asUint8Array (): Uint8Array {
    return this._value;
  }

  /**
   * Covert this key to buffer.
   */
  asBuffer (): Buffer {
    return Buffer.from(this._value);
  }

  /**
   * Convert this key to hex-encoded string.
   */
  toHex (): string {
    return this.asBuffer().toString('hex');
  }

  /**
   * Convert this key to human-readable representation.
   */
  humanize (): string {
    return hasher.humanize(this.toHex());
  }

  /**
   * Same as `PublicKey.humanize()`.
   */
  toString (): string {
    return this.toHex();
  }

  /**
   * Same as `PublicKey.humanize()`.
   */
  toJSON () {
    return this.toHex();
  }

  /**
   * Used by NodeJS to get textual representation of this object when it's printed with a `console.log` statement.
   */
  [inspect.custom] () {
    return `<PublicKey ${this.humanize()}>`;
  }

  /**
   * Test this key for equality with some other key.
   */
  equals (other: PublicKeyLike) {
    const otherConverted = PublicKey.from(other);
    if (this._value.length !== otherConverted._value.length) {
      return false;
    }
    let equal = true;
    this._value;
    for (let i = 0; i < this._value.length; i++) {
      equal &&= this._value[i] === otherConverted._value[i];
    }
    return equal;
  }
}

/**
 * All representations that can be converted to a PublicKey.
 */
// TODO(burdon): Remove this.
export type PublicKeyLike =
  | PublicKey
  | Buffer
  | Uint8Array
  | string

const hasher = new HumanHasher();

export const publicKeySubstitutions = {
  // TODO(dmaretskyi): Rename to dxos.crypto.PublicKey.
  'dxos.halo.keys.PubKey': {
    encode: (value: PublicKey) => ({ data: value.asUint8Array() }),
    decode: (value: any) => PublicKey.from(new Uint8Array(value.data))
  },
  // TODO(dmaretskyi): Shouldn't be substitutted to PublicKey.
  'dxos.halo.keys.PrivKey': {
    encode: (value: Buffer) => ({ data: new Uint8Array(value) }),
    decode: (value: any) => PublicKey.from(new Uint8Array(value.data)).asBuffer()
  }
};
