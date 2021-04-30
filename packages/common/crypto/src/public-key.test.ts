//
// Copyright 2020 DXOS.org
//

import { randomBytes } from './keys';
import { PublicKey } from './public-key';

const KEY_HEX = '2c28f0d08ccc5340aee02655675be5796227a28d27b9704df34b7d8b2d9fddc7';

it('formatting', () => {
  const key = PublicKey.fromHex(KEY_HEX);

  expect(PublicKey.isPublicKey(key)).toEqual(true);
  PublicKey.assertValidPublicKey(key);

  expect(key.humanize()).toEqual('lemon-nitrogen-sixteen-undress');
  expect(key.toHex()).toEqual(KEY_HEX);
});

it('asBuffer', () => {
  const key = PublicKey.fromHex(KEY_HEX);
  const buffer = key.asBuffer();

  expect(buffer).toBeInstanceOf(Buffer);

  expect(Buffer.from(KEY_HEX, 'hex').equals(buffer)).toEqual(true);
});

it('asUint8Array', () => {
  const key = PublicKey.fromHex(KEY_HEX);

  const array = key.asUint8Array();
  expect(array).toBeInstanceOf(Uint8Array);
  expect(Buffer.from(KEY_HEX, 'hex').equals(Buffer.from(array))).toEqual(true);

  expect(PublicKey.from(Buffer.from(KEY_HEX, 'hex')).asUint8Array()).toBeInstanceOf(Uint8Array);
});

it('from', () => {
  expect(PublicKey.from(KEY_HEX).toHex())
    .toEqual(KEY_HEX);

  expect(PublicKey.from(Buffer.from(KEY_HEX, 'hex')).toHex())
    .toEqual(KEY_HEX);

  expect(PublicKey.from(new Uint8Array(32)).toHex())
    .toEqual('0000000000000000000000000000000000000000000000000000000000000000');

  expect(() => PublicKey.from(new Uint8Array(25))).toThrow();

  expect(() => PublicKey.from('foo')).toThrow();
});

it('equals', () => {
  expect(PublicKey.equals(
    PublicKey.from(KEY_HEX),
    PublicKey.from(KEY_HEX)
  )).toEqual(true);

  expect(PublicKey.equals(
    PublicKey.from(randomBytes()),
    PublicKey.from(randomBytes())
  )).toEqual(false);
});
