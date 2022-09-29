//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { PublicKey } from './public-key';

const TEST_KEY_HEX = '2c28f0d08ccc5340aee02655675be5796227a28d27b9704df34b7d8b2d9fddc7';

describe('PublicKey', function () {
  it('Basic key operations', function () {
    const publicKey = PublicKey.random().toString();
    expect(PublicKey.stringify(PublicKey.bufferize(publicKey))).to.equal(publicKey);
  });

  it('formatting', function () {
    const key = PublicKey.fromHex(TEST_KEY_HEX);

    expect(PublicKey.isPublicKey(key)).to.equal(true);
    PublicKey.assertValidPublicKey(key);
    expect(key.toHex()).to.equal(TEST_KEY_HEX);
  });

  it('asBuffer', function () {
    const key = PublicKey.fromHex(TEST_KEY_HEX);
    const buffer = key.asBuffer();

    expect(buffer).to.be.instanceOf(Buffer);
    expect(Buffer.from(TEST_KEY_HEX, 'hex').equals(buffer)).to.equal(true);
  });

  it('asUint8Array', function () {
    const key = PublicKey.fromHex(TEST_KEY_HEX);

    const array = key.asUint8Array();
    expect(array).to.be.instanceOf(Uint8Array);
    expect(Buffer.from(TEST_KEY_HEX, 'hex').equals(Buffer.from(array))).to.equal(true);
    expect(PublicKey.from(Buffer.from(TEST_KEY_HEX, 'hex')).asUint8Array()).to.be.instanceOf(Uint8Array);
  });

  it('from', function () {
    expect(PublicKey.from(TEST_KEY_HEX).toHex())
      .to.equal(TEST_KEY_HEX);

    expect(PublicKey.from(Buffer.from(TEST_KEY_HEX, 'hex')).toHex())
      .to.equal(TEST_KEY_HEX);

    expect(PublicKey.from(new Uint8Array(32)).toHex())
      .to.equal('0000000000000000000000000000000000000000000000000000000000000000');
  });

  it('equals', function () {
    expect(PublicKey.equals(
      PublicKey.from(TEST_KEY_HEX),
      PublicKey.from(TEST_KEY_HEX)
    )).to.equal(true);

    expect(PublicKey.equals(
      PublicKey.random(),
      PublicKey.random()
    )).to.equal(false);
  });

  it('expect equality', function () {
    const key = PublicKey.random();
    expect(key).to.equal(PublicKey.from(key.toHex()));
  });
});
