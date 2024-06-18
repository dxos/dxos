//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';
import { describe, test } from 'vitest';

import { PublicKey } from './public-key';

const TEST_KEY_HEX = '2c28f0d08ccc5340aee02655675be5796227a28d27b9704df34b7d8b2d9fddc7';

describe('PublicKey', () => {
  test('Basic key operations', () => {
    const publicKey = PublicKey.random().toString();
    expect(PublicKey.stringify(PublicKey.bufferize(publicKey))).to.equal(publicKey);
  });

  test('formatting', () => {
    const key = PublicKey.fromHex(TEST_KEY_HEX);

    expect(PublicKey.isPublicKey(key)).to.equal(true);
    PublicKey.assertValidPublicKey(key);
    expect(key.toHex()).to.equal(TEST_KEY_HEX);
  });

  test('asBuffer', () => {
    const key = PublicKey.fromHex(TEST_KEY_HEX);
    const buffer = key.asBuffer();

    expect(buffer).to.be.instanceOf(Buffer);
    expect(Buffer.from(TEST_KEY_HEX, 'hex').equals(buffer)).to.equal(true);
  });

  test('asUint8Array', () => {
    const key = PublicKey.fromHex(TEST_KEY_HEX);

    const array = key.asUint8Array();
    expect(array).to.be.instanceOf(Uint8Array);
    expect(Buffer.from(TEST_KEY_HEX, 'hex').equals(Buffer.from(array))).to.equal(true);
    expect(PublicKey.from(Buffer.from(TEST_KEY_HEX, 'hex')).asUint8Array()).to.be.instanceOf(Uint8Array);
  });

  test('from', () => {
    expect(PublicKey.from(TEST_KEY_HEX).toHex()).to.equal(TEST_KEY_HEX);

    expect(PublicKey.from(Buffer.from(TEST_KEY_HEX, 'hex')).toHex()).to.equal(TEST_KEY_HEX);

    expect(PublicKey.from(new Uint8Array(32)).toHex()).to.equal(
      '0000000000000000000000000000000000000000000000000000000000000000',
    );
  });

  test('equals', () => {
    expect(PublicKey.equals(PublicKey.from(TEST_KEY_HEX), PublicKey.from(TEST_KEY_HEX))).to.equal(true);

    expect(PublicKey.equals(PublicKey.random(), PublicKey.random())).to.equal(false);
  });

  test('expect equality', () => {
    const key = PublicKey.random();
    expect(PublicKey.equals(key, PublicKey.from(key.toHex()))).to.be.true;
  });

  test('base32', () => {
    const key = PublicKey.randomOfLength(20); // Space keys will be cut to first 20 bytes of sha-256 hash.
    const encoded = key.toMultibase32();

    expect(PublicKey.fromMultibase32(encoded).toHex()).to.equal(key.toHex());
  });
});
