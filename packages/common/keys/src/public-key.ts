//
// Copyright 2020 DXOS.org
//

import { inspect, type InspectOptionsStylized } from 'node:util';
import base32Encode from 'base32-encode';
import base32Decode from 'base32-decode';

import { truncateKey, devtoolsFormatter, type DevtoolsFormatter, equalsSymbol, type Equatable } from '@dxos/debug';
import { invariant } from '@dxos/invariant';

export const PUBLIC_KEY_LENGTH = 32;
export const SECRET_KEY_LENGTH = 64;

/**
 * All representations that can be converted to a PublicKey.
 */
export type PublicKeyLike = PublicKey | Buffer | Uint8Array | ArrayBuffer | string;

/**
 * The purpose of this class is to assure consistent use of keys throughout the project.
 * Keys should be maintained as buffers in objects and proto definitions, and converted to hex
 * strings as late as possible (eg, to log/display).
 */
export class PublicKey implements Equatable {
  /**
   * Creates new instance of PublicKey automatically determining the input format.
   * @param source A Buffer, or Uint8Array, or hex encoded string, or something with an `asUint8Array` method on it
   * @returns PublicKey
   */
  static from(source: PublicKeyLike): PublicKey {
    invariant(source);
    if (source instanceof PublicKey) {
      return source;
    } else if (source instanceof Buffer) {
      return new PublicKey(new Uint8Array(source.buffer, source.byteOffset, source.byteLength));
    } else if (source instanceof Uint8Array) {
      return new PublicKey(source);
    } else if (source instanceof ArrayBuffer) {
      return new PublicKey(new Uint8Array(source));
    } else if (typeof source === 'string') {
      // TODO(burdon): Check length.
      return PublicKey.fromHex(source);
    } else if ((<any>source).asUint8Array) {
      return new PublicKey((<any>source).asUint8Array());
    } else {
      throw new TypeError(`Unable to create PublicKey from ${source}`);
    }
  }

  /**
   * Same as `PublicKey.from` but does not throw and instead returns a `{ key: PublicKey }` or `{ error: Error }`
   * @param source Same PublicKeyLike argument as for `PublicKey.from`
   * @returns PublicKey
   */
  static safeFrom(source?: PublicKeyLike): PublicKey | undefined {
    if (!source) {
      return undefined;
    }

    try {
      const key = PublicKey.from(source);
      // TODO(wittjosiah): Space keys don't pass this check.
      // if (key.length !== PUBLIC_KEY_LENGTH && key.length !== SECRET_KEY_LENGTH) {
      //   return undefined;
      // }
      return key;
    } catch (err: any) {
      return undefined;
    }
  }

  /**
   * Creates new instance of PublicKey from hex string.
   */
  static fromHex(hex: string) {
    if (hex.startsWith('0x')) {
      hex = hex.slice(2);
    }

    const buf = Buffer.from(hex, 'hex');
    // TODO(burdon): Test if key.
    return new PublicKey(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
  }

  /**
   * Creates a new key.
   */
  static random(): PublicKey {
    // TODO(burdon): Enable seed for debugging.
    return PublicKey.from(randomBytes(PUBLIC_KEY_LENGTH));
  }

  static randomOfLength(length: number): PublicKey {
    return PublicKey.from(randomBytes(length));
  }

  static *randomSequence(): Generator<PublicKey> {
    for (let i = 0; i < 1_0000; i++) {
      // Counter just to protect against infinite loops.
      yield PublicKey.random();
    }
    throw new Error('Too many keys requested');
  }

  /**
   * Tests if provided values is an instance of PublicKey.
   */
  static isPublicKey(value: any): value is PublicKey {
    return value instanceof PublicKey;
  }

  /**
   * Asserts that provided values is an instance of PublicKey.
   */
  static assertValidPublicKey(value: any): asserts value is PublicKey {
    if (!this.isPublicKey(value)) {
      throw new TypeError('Invalid PublicKey');
    }
  }

  /**
   * Tests two keys for equality.
   */
  static equals(left: PublicKeyLike, right: PublicKeyLike) {
    return PublicKey.from(left).equals(right);
  }

  /**
   * @param str string representation of key.
   * @return Key buffer.
   * @deprecated All keys should be represented as instances of PublicKey.
   */
  static bufferize(str: string): Buffer {
    invariant(typeof str === 'string', 'Invalid type');
    const buffer = Buffer.from(str, 'hex');
    // invariant(buffer.length === PUBLIC_KEY_LENGTH || buffer.length === SECRET_KEY_LENGTH,
    //   `Invalid key length: ${buffer.length}`);
    return buffer;
  }

  /**
   * @param key key like data structure (but not PublicKey which should use toString).
   * @return Hex string representation of key.
   * @deprecated All keys should be represented as instances of PublicKey.
   */
  static stringify(key: Buffer | Uint8Array | ArrayBuffer): string {
    if (key instanceof PublicKey) {
      key = key.asBuffer();
    } else if (key instanceof Uint8Array) {
      key = Buffer.from(key.buffer, key.byteOffset, key.byteLength);
    }

    invariant(key instanceof Buffer, 'Invalid type');
    return key.toString('hex');
  }

  /**
   * To be used with ComplexMap and ComplexSet.
   * Returns a scalar representation for this key.
   */
  static hash(key: PublicKey): string {
    return key.toHex();
  }

  static fromBase32(encoded: string): PublicKey {
    return new PublicKey(new Uint8Array(base32Decode(encoded, 'RFC4648')));
  }

  constructor(private readonly _value: Uint8Array) {
    if (!(_value instanceof Uint8Array)) {
      throw new TypeError(`Expected Uint8Array, got: ${_value}`);
    }
  }

  toString(): string {
    return this.toHex();
  }

  toJSON() {
    return this.toHex();
  }

  toJSONL(): string {
    return this.truncate();
  }

  get length() {
    return this._value.length;
  }

  toHex(): string {
    return this.asBuffer().toString('hex');
  }

  toBase32(): string {
    return base32Encode(this._value, 'RFC4648');
  }

  truncate(length = undefined) {
    return truncateKey(this, length);
  }

  asBuffer(): Buffer {
    return Buffer.from(this._value.buffer, this._value.byteOffset, this._value.byteLength);
  }

  asUint8Array(): Uint8Array {
    return this._value;
  }

  getInsecureHash(modulo: number) {
    return Math.abs(this._value.reduce((acc, val) => (acc ^ val) | 0, 0)) % modulo;
  }

  /**
   * Used by Node.js to get textual representation of this object when it's printed with a `console.log` statement.
   */
  [inspect.custom](depth: number, options: InspectOptionsStylized) {
    if (!options.colors || typeof process.stdout.hasColors !== 'function' || !process.stdout.hasColors()) {
      return `<PublicKey ${this.truncate()}>`;
    }

    const printControlCode = (code: number) => {
      return `\x1b[${code}m`;
    };

    // NOTE: Keep in sync with formatter colors.
    const colors = [
      'red',
      'green',
      'yellow',
      'blue',
      'magenta',
      'cyan',
      'redBright',
      'greenBright',
      'yellowBright',
      'blueBright',
      'magentaBright',
      'cyanBright',
      'whiteBright',
    ];
    const color = colors[this.getInsecureHash(colors.length)];

    return `PublicKey(${printControlCode(inspect.colors[color]![0])}${this.truncate()}${printControlCode(
      inspect.colors.reset![0],
    )})`;
  }

  get [devtoolsFormatter](): DevtoolsFormatter {
    return {
      header: () => {
        // NOTE: Keep in sync with inspect colors.
        const colors = [
          'darkred',
          'green',
          'orange',
          'blue',
          'darkmagenta',
          'darkcyan',
          'red',
          'green',
          'orange',
          'blue',
          'magenta',
          'darkcyan',
          'black',
        ];
        const color = colors[this.getInsecureHash(colors.length)];

        return [
          'span',
          {},
          ['span', {}, 'PublicKey('],
          ['span', { style: `color: ${color};` }, this.truncate()],
          ['span', {}, ')'],
        ];
      },
    };
  }

  /**
   * Test this key for equality with some other key.
   */
  equals(other: PublicKeyLike) {
    const otherConverted = PublicKey.from(other);
    if (this._value.length !== otherConverted._value.length) {
      return false;
    }

    let equal = true;
    for (let i = 0; i < this._value.length; i++) {
      equal &&= this._value[i] === otherConverted._value[i];
    }

    return equal;
  }

  [equalsSymbol](other: any) {
    if (!PublicKey.isPublicKey(other)) {
      return false;
    }

    return this.equals(other);
  }
}

const randomBytes = (length: number) => {
  // globalThis.crypto is not available in Node.js when running in vitest even though the documentation says it should be.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const webCrypto = globalThis.crypto ?? require('node:crypto').webcrypto;

  const bytes = new Uint8Array(length);
  webCrypto.getRandomValues(bytes);
  return bytes;
};
