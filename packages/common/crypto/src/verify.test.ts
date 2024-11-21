/**
 * Verify a signature with the given key.
 */
//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { PublicKey } from '@dxos/keys';

import { createKeyPair, sign } from './keys';
import { verifySignature } from './verify';

describe('verify', () => {
  test('keypair conversion', async () => {
    const keypair = createKeyPair();
    const message = Buffer.from('hello');
    expect(
      await verifySignature(PublicKey.from(keypair.publicKey), message, sign(message, keypair.secretKey), {
        name: 'Ed25519',
      }),
    ).toBeTruthy();
  });
});
