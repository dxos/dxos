//
// Copyright 2020 DXOS.org
//

// dxos-testing-browser

import { createKeyPair, createId, hasher, humanize, keyToBuffer, keyToString } from './keys';

test('Basic key operations', () => {
  const { publicKey } = createKeyPair();

  expect(keyToBuffer(keyToString(publicKey))).toEqual(publicKey);

  expect(() => keyToString('not-a-buffer' as any)).toThrowError();
  expect(() => keyToBuffer('not-a-value-hex-key')).toThrowError();
  expect(() => keyToBuffer(publicKey as any)).toThrowError();
});

test('Hashing', () => {
  const { publicKey, secretKey } = createKeyPair();

  expect(createId()).not.toEqual(createId());

  expect(humanize(publicKey)).not.toEqual(humanize(secretKey));
  expect(humanize(publicKey)).toEqual(hasher.humanize(keyToString(publicKey)));
  expect(hasher.humanize(createId())).toBeDefined();
});
