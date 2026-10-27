//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type PendingSpace } from '@dxos/client';
import { Context } from '@dxos/context';
import * as EffectEx from '@dxos/effect/EffectEx';
import { PublicKey, SpaceId } from '@dxos/keys';
import { getSharedObjectsChallenge } from '@dxos/protocols';

import { decodeSharePayload } from './util/share-payload.ts';

/** Retries of a read that EDGE answers 404 while the invitation reaches it, which it asks to be retried. */
const READ_RETRIES = 2;

/**
 * The space a share link joins, as a pending space a boot-cached client opens before it has joined: the space root and
 * the shared documents, which EDGE serves to whoever proves they hold the link invitation's guest key. Needs no
 * identity or worker, so it runs while the app boots.
 * @param payload The link's `share` query parameter.
 * @returns Nothing for a link that carries no invitation, which only members can open.
 */
export const load = async ({ payload, edgeUrl }: { payload: string; edgeUrl: string }): Promise<PendingSpace[]> => {
  const { spaceId, invitation: json } = await EffectEx.runPromise(decodeSharePayload(payload));
  if (!json || !SpaceId.isValid(spaceId)) {
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
  const challenge = getSharedObjectsChallenge({ spaceId, invitationId: invitation.invitationId, issuedAt });
  const { EdgeHttpClient } = await import('@dxos/edge-client');
  const { spaceRootUrl, rows } = await new EdgeHttpClient(edgeUrl).readSharedObjects(
    Context.default(),
    spaceId,
    {
      invitationId: invitation.invitationId,
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
      rows: rows.map(({ documentId, heads, data }) => ({ documentId, heads, bytes: fromBase64(data) })),
    },
  ];
};

/**
 * Signs SHA-256 of `message` with an invitation's guest key, a libsodium Ed25519 secret key (the 32-byte seed followed
 * by the public key); with WebCrypto, so the app's main thread need not load the sodium code the worker uses.
 * @returns The base64 signature.
 */
export const signWithGuestKey = async (
  message: string,
  { secretKey, publicKey }: { secretKey: Uint8Array; publicKey: Uint8Array },
): Promise<string> => {
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'OKP', crv: 'Ed25519', d: toBase64Url(secretKey.slice(0, 32)), x: toBase64Url(publicKey) },
    { name: 'Ed25519' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'Ed25519' }, key, digest));
  return btoa(Array.from(signature, (byte) => String.fromCharCode(byte)).join(''));
};

const toBase64Url = (bytes: Uint8Array): string =>
  btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');

const fromBase64 = (data: string): Uint8Array => Uint8Array.from(atob(data), (char) => char.charCodeAt(0));
