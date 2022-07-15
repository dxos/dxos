//
// Copyright 2020 DXOS.org
//

// DXOS testing browser.

import { PublicKey } from '@dxos/protocols';

import { createKeyPair, createId, hasher, humanize } from './keys';

test('Hashing', () => {
  const { publicKey, secretKey } = createKeyPair();

  expect(createId()).not.toEqual(createId());

  expect(humanize(publicKey)).not.toEqual(humanize(secretKey));
  expect(humanize(publicKey)).toEqual(hasher.humanize(PublicKey.stringify(publicKey)));
  expect(hasher.humanize(createId())).toBeDefined();
});
