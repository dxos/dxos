//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createKeyPair, verify } from '@dxos/crypto';

import * as ShareCache from './ShareCache.ts';

describe('share cache', () => {
  test('signs with a guest key as the sodium code the worker uses would verify it', async ({ expect }) => {
    const keypair = createKeyPair();
    const message = 'dxos.shared-objects:space:invitation:1';
    const signature = await ShareCache.signWithGuestKey(message, {
      secretKey: new Uint8Array(keypair.secretKey),
      publicKey: new Uint8Array(keypair.publicKey),
    });

    const digest = Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message)));
    expect(verify(digest, Buffer.from(signature, 'base64'), keypair.publicKey)).toBe(true);
    expect(verify(Buffer.from('another message'), Buffer.from(signature, 'base64'), keypair.publicKey)).toBe(false);
  });
});
