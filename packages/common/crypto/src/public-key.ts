//
// Copyright 2020 DXOS.org
//

import HumanHasher from 'humanhash';
import crypto from 'hypercore-crypto';
import { inspect } from 'util';

export class PublicKey {
  /**
   * Length of a public key in bytes.
   */
  static LENGTH = 32;

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
    if (_value.length !== PublicKey.LENGTH) {
      throw new TypeError(`Public key has invalid length. Expected: ${PublicKey.length}, got: ${_value.length}`);
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
  toJson () {
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
    let equal = true;
    for (let i = 0; i < PublicKey.LENGTH; i++) {
      equal &&= this._value[i] === otherConverted._value[i];
    }
    return equal;
  }
}

/**
 * All representations that can be converted to a PublicKey.
 */
export type PublicKeyLike =
  | PublicKey
  | Buffer
  | Uint8Array
  | string

const hasher = new HumanHasher();
