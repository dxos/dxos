//
// Copyright 2020 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { createId, createKeyPair, randomBytes, sign, verify } from './keys';

test('Create id is unique', () => {
  expect(createId()).not.to.equal(createId());
});

describe('verify', () => {
  test('success', () => {
    const keypair = createKeyPair();
    const message = randomBytes(32);
    const signature = sign(message, keypair.secretKey);
    expect(verify(message, signature, keypair.publicKey)).to.be.true;
  });

  test('failure', () => {
    const keypair1 = createKeyPair();
    const keypair2 = createKeyPair();
    const message = randomBytes(32);
    const signature = sign(message, keypair1.secretKey);
    expect(verify(message, signature, keypair2.publicKey)).to.be.false;
  });
});
