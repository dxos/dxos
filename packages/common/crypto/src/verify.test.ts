/**
 * Verify a signature with the given key.
 */
//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { PublicKey } from '@dxos/keys';

import { createKeyPair } from './keys';
import { ed25519Signature, verifySignature } from './verify';

describe('verify', () => {
  test('keypair conversion', async () => {
    const keypair = createKeyPair();
    const message = Buffer.from('hello');
    const signature = await ed25519Signature(keypair.secretKey, message);
    expect(
      await verifySignature(PublicKey.from(keypair.publicKey), message, signature, {
        name: 'Ed25519',
      }),
    ).toBeTruthy();
  });
});
