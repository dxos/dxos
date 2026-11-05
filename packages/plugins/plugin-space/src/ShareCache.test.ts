//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createKeyPair, verify } from '@dxos/crypto';
import * as EffectEx from '@dxos/effect/EffectEx';
import { SpaceId } from '@dxos/keys';

import * as ShareCache from './ShareCache.ts';
import { encodeSharePayload } from './util/index.ts';

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

  test('admits a guest only with a link that carries an invitation', async ({ expect }) => {
    const encode = (invitation?: { invitationId: string }) =>
      EffectEx.runPromise(
        encodeSharePayload({ version: 1, spaceId: SpaceId.random(), invitation, plugins: [], objects: ['object'] }),
      );
    expect(await ShareCache.admitsGuest(await encode({ invitationId: 'invitation' }))).toBe(true);
    expect(await ShareCache.admitsGuest(await encode())).toBe(false);
    expect(await ShareCache.admitsGuest('not a payload')).toBe(false);
  });

  test('asks EDGE for nothing without a guest key or for a space already cached', async ({ expect }) => {
    const spaceId = SpaceId.random();
    const encode = (invitation?: { invitationId: string }) =>
      EffectEx.runPromise(encodeSharePayload({ version: 1, spaceId, invitation, plugins: [], objects: ['object'] }));
    // Nothing listens here, so a request would fail the load rather than return nothing.
    const load = async (payload: string, cachedSpaceIds: ReadonlySet<string> = new Set()) =>
      ShareCache.load({ payload, edgeUrl: 'http://127.0.0.1:1', cachedSpaceIds });

    expect(await load(await encode())).toEqual([]);
    expect(await load(await encode({ invitationId: 'invitation' }))).toEqual([]);
    expect(await load(await encode({ invitationId: 'invitation' }), new Set([spaceId]))).toEqual([]);
  });
});
