//
// Copyright 2020 DXOS.org
//

import { expect, test } from 'vitest';

import { createId, createKeyPair } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';

import { humanize } from './human-hash';

test('Hashing', () => {
  const { publicKey, secretKey } = createKeyPair();

  expect(humanize(publicKey)).not.to.equal(humanize(secretKey));
  expect(humanize(publicKey)).to.equal(humanize(PublicKey.from(publicKey)));
  expect(humanize(createId())).to.exist;
});
