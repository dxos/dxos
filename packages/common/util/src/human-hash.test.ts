//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { createKeyPair, createId } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { test } from '@dxos/mocha';

import { humanize } from './human-hash';

test('Hashing', function () {
  const { publicKey, secretKey } = createKeyPair();

  expect(humanize(publicKey)).not.to.equal(humanize(secretKey));
  expect(humanize(publicKey)).to.equal(humanize(PublicKey.from(publicKey)));
  expect(humanize(createId())).to.exist;
});
