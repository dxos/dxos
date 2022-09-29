//
// Copyright 2020 DXOS.org
//

import expect from 'expect';

import { PublicKey } from './public-key';

const TEST_KEY_HEX = '2c28f0d08ccc5340aee02655675be5796227a28d27b9704df34b7d8b2d9fddc7';

it('Basic key operations', () => {
  const publicKey = PublicKey.random().asBuffer();
  expect(PublicKey.bufferize(PublicKey.stringify(publicKey))).toEqual(publicKey);
});

it('formatting', () => {
  const key = PublicKey.fromHex(TEST_KEY_HEX);

  expect(PublicKey.isPublicKey(key)).toEqual(true);
  PublicKey.assertValidPublicKey(key);
  expect(key.toHex()).toEqual(TEST_KEY_HEX);
});

it('asBuffer', () => {
  const key = PublicKey.fromHex(TEST_KEY_HEX);
  const buffer = key.asBuffer();

  expect(buffer).toBeInstanceOf(Buffer);
  expect(Buffer.from(TEST_KEY_HEX, 'hex').equals(buffer)).toEqual(true);
});

it('asUint8Array', () => {
  const key = PublicKey.fromHex(TEST_KEY_HEX);

  const array = key.asUint8Array();
  expect(array).toBeInstanceOf(Uint8Array);
  expect(Buffer.from(TEST_KEY_HEX, 'hex').equals(Buffer.from(array))).toEqual(true);
  expect(PublicKey.from(Buffer.from(TEST_KEY_HEX, 'hex')).asUint8Array()).toBeInstanceOf(Uint8Array);
});

it('from', () => {
  expect(PublicKey.from(TEST_KEY_HEX).toHex())
    .toEqual(TEST_KEY_HEX);

  expect(PublicKey.from(Buffer.from(TEST_KEY_HEX, 'hex')).toHex())
    .toEqual(TEST_KEY_HEX);

  expect(PublicKey.from(new Uint8Array(32)).toHex())
    .toEqual('0000000000000000000000000000000000000000000000000000000000000000');
});

it('equals', () => {
  expect(PublicKey.equals(
    PublicKey.from(TEST_KEY_HEX),
    PublicKey.from(TEST_KEY_HEX)
  )).toEqual(true);

  expect(PublicKey.equals(
    PublicKey.random(),
    PublicKey.random()
  )).toEqual(false);
});

it('expect equality', () => {
  const key = PublicKey.random();
  expect(key).toEqual(PublicKey.from(key.toHex()));
});
