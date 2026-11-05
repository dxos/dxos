//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import { type PendingSpace } from '@dxos/client';
import { Context } from '@dxos/context';
import * as EffectEx from '@dxos/effect/EffectEx';
import { PublicKey, SpaceId } from '@dxos/keys';
import { getSharedObjectsChallenge } from '@dxos/protocols';

import { decodeSharePayload, fromBase64Url, toBase64Url } from './util/share-payload.ts';

/** Retries of a read that EDGE answers 404 while the invitation reaches it, which it asks to be retried. */
const READ_RETRIES = 2;

/**
 * The space a share link joins, as a pending space a boot-cached client opens before it has joined: the space root and
 * the documents of the objects the link names, which EDGE serves to whoever proves they hold the link invitation's
 * guest key. Needs no identity or worker, so it runs while the app boots.
 * @param payload The link's `share` query parameter.
 * @param cachedSpaceIds Spaces the boot cache already holds; EDGE is not asked for one of them.
 * @returns Nothing for a link that carries no invitation, which only members can open, or whose space is cached.
 */
export const load = async ({
  payload,
  edgeUrl,
  cachedSpaceIds,
}: {
  payload: string;
  edgeUrl: string;
  cachedSpaceIds: ReadonlySet<string>;
}): Promise<PendingSpace[]> => {
  const { spaceId, invitation: json, objects } = await EffectEx.runPromise(decodeSharePayload(payload));
  if (!json || !SpaceId.isValid(spaceId) || cachedSpaceIds.has(spaceId)) {
    return [];
  }
  const { InvitationEncoder } = await import('@dxos/client/invitations');
  const invitation = InvitationEncoder.fromJson(json);
  const secretKey = invitation.guestKeypair?.privateKey?.data;
  const publicKey = invitation.guestKeypair?.publicKey?.data;
  const spaceKey = invitation.spaceKey?.data;
  if (!secretKey || !publicKey || !spaceKey) {
    return [];
  }

  const issuedAt = Date.now();
  const challenge = getSharedObjectsChallenge({
    spaceId,
    invitationId: invitation.invitationId,
    objectIds: objects,
    issuedAt,
  });
  const { EdgeHttpClient } = await import('@dxos/edge-client');
  const { spaceRootUrl, rows } = await new EdgeHttpClient(edgeUrl).readSharedObjects(
    Context.default(),
    spaceId,
    {
      invitationId: invitation.invitationId,
      objectIds: [...objects],
      issuedAt,
      signature: await signWithGuestKey(challenge, { secretKey, publicKey }),
    },
    { retry: { count: READ_RETRIES } },
  );
  return [
    {
      spaceId,
      spaceKey: PublicKey.from(spaceKey),
      spaceRootUrl,
      rows: rows.map(({ documentId, heads, data }) => ({ documentId, heads, bytes: fromBase64Url(data) })),
    },
  ];
};

/**
 * Whether a link's `share` query parameter carries an invitation, which admits a browser that is not a member yet; a
 * restricted link carries none.
 */
export const admitsGuest = (payload: string): Promise<boolean> =>
  EffectEx.runPromise(
    decodeSharePayload(payload).pipe(
      Effect.map(({ invitation }) => invitation !== undefined),
      Effect.orElseSucceed(() => false),
    ),
  );

/**
 * Signs SHA-256 of `message` with an invitation's guest key, a libsodium Ed25519 secret key (the 32-byte seed followed
 * by the public key); with WebCrypto, so the app's main thread need not load the sodium code the worker uses.
 * @returns The base64 signature.
 */
export const signWithGuestKey = async (
  message: string,
  { secretKey, publicKey }: { secretKey: Uint8Array; publicKey: Uint8Array },
): Promise<string> => {
  const key = await crypto.subtle
    .importKey(
      'jwk',
      { kty: 'OKP', crv: 'Ed25519', d: toBase64Url(secretKey.slice(0, 32)), x: toBase64Url(publicKey) },
      { name: 'Ed25519' },
      false,
      ['sign'],
    )
    .catch((cause) => {
      // Older browsers (before Chrome 137, Firefox 129, Safari 17) have no Ed25519 in WebCrypto.
      throw new Error('This browser cannot sign with Ed25519, so the shared object renders once joined.', { cause });
    });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'Ed25519' }, key, digest));
  return btoa(Array.from(signature, (byte) => String.fromCharCode(byte)).join(''));
};
