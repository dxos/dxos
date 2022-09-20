//
// Copyright 2020 DXOS.org
//

// DXOS testing browser.

import { createKeyPair, createId } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';

import { humanize } from './human-hash';

test('Hashing', () => {
  const { publicKey, secretKey } = createKeyPair();

  expect(humanize(publicKey)).not.toEqual(humanize(secretKey));
  expect(humanize(publicKey)).toEqual(humanize(PublicKey.from(publicKey)));
  expect(humanize(createId())).toBeDefined();
});
