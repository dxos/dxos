//
// Copyright 2020 DXOS.org
//

import assert from 'node:assert';
import { inspect, InspectOptionsStylized } from 'node:util';
import randomBytes from 'randombytes';

import { truncateKey, devtoolsFormatter, DevtoolsFormatter } from '@dxos/debug';

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
export class PublicKey {
  /**
   * Creates new instance of PublicKey automatically determining the input format.
   * @param source A Buffer, or Uint8Array, or hex encoded string, or something with an `asUint8Array` method on it
   * @returns PublicKey
   */
  static from(source: PublicKeyLike): PublicKey {
    assert(source);
    if (source instanceof PublicKey) {
      return source;
    } else if (source instanceof Buffer) {
      return new PublicKey(new Uint8Array(source));
    } else if (source instanceof Uint8Array) {
      return new PublicKey(source);
    } else if(source instanceof ArrayBuffer) {
      return new PublicKey(new Uint8Array(source));
    } else if (typeof source === 'string') {
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
      return PublicKey.from(source);
    } catch (error: any) {
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

    return new PublicKey(new Uint8Array(Buffer.from(hex, 'hex')));
  }

  /**
   * Creates a new key.
   */
  static random(): PublicKey {
    // TODO(burdon): Enable seed for debugging.
    return PublicKey.from(randomBytes(32));
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
   * @param Hex string representation of key.
   * @return Key buffer.
   * @deprecated All keys should be represented as instances of PublicKey.
   */
  static bufferize(str: string): Buffer {
    assert(typeof str === 'string', 'Invalid type');
    const buffer = Buffer.from(str, 'hex');
    // assert(buffer.length === PUBLIC_KEY_LENGTH || buffer.length === SECRET_KEY_LENGTH,
    //   `Invalid key length: ${buffer.length}`);
    return buffer;
  }

  /**
   * @param Public key like data structure (but not PublicKey which should use toString).
   * @return Hex string representation of key.
   * @deprecated All keys should be represented as instances of PublicKey.
   */
  static stringify(key: Buffer | Uint8Array | ArrayBuffer): string {
    if (key instanceof PublicKey) {
      key = key.asBuffer();
    } else if (key instanceof Uint8Array) {
      key = Buffer.from(key);
    }

    assert(key instanceof Buffer, 'Invalid type');
    return key.toString('hex');
  }

  /**
   * To be used with ComplexMap and ComplexSet.
   * Returns a scalar representation for this key.
   */
  static hash(key: PublicKey): string {
    return key.toHex();
  }

  constructor(private readonly _value: Uint8Array) {
    if (!(_value instanceof Uint8Array)) {
      throw new TypeError(`Expected Uint8Array, got: ${_value}`);
    }
  }

  // TODO(burdon): Rename toDebugHex? Make default for toString?
  truncate(length = 4) {
    return truncateKey(this, length);
  }

  toString(): string {
    return this.toHex();
  }

  // TODO(burdon): How is this used?
  toJSON() {
    return this.toHex();
  }

  toHex(): string {
    return this.asBuffer().toString('hex');
  }

  asBuffer(): Buffer {
    return Buffer.from(this._value);
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
    if (!options.colors || !process.stdout.hasColors()) {
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
      'whiteBright'
    ];
    const color = colors[this.getInsecureHash(colors.length)];

    return `PublicKey(${printControlCode(inspect.colors[color]![0])}${this.truncate()}${printControlCode(
      inspect.colors.reset![0]
    )})`;
  }

  [devtoolsFormatter](): DevtoolsFormatter {
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
          'black'
        ];
        const color = colors[this.getInsecureHash(colors.length)];

        return [
          'span',
          {},
          ['span', {}, 'PublicKey('],
          ['span', { style: `color: ${color};` }, this.truncate()],
          ['span', {}, ')']
        ];
      }
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
}
