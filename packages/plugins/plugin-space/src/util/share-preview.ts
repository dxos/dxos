//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as UrlPath from '@dxos/app-toolkit/UrlPath';
import { Context } from '@dxos/context';
import { Obj } from '@dxos/echo';
import { StaticRefResolver } from '@dxos/echo/internal';
import { EID, type SpaceId } from '@dxos/keys';
import { type SharedObject, getSharedObjectsChallenge } from '@dxos/protocols';
import { type Invitation } from '@dxos/protocols/buf/dxos/client/invitation_pb';

import { SpaceOperationError } from '../operations/errors.ts';

/** A share link's first look: the shared object as EDGE's index last read it, decoded but not live. */
export type SharePreview = {
  subject: Obj.Unknown;
};

/** First looks by {@link sharePreviewKey}, until the object itself resolves in its plank. */
export const sharePreviewsAtom = Atom.make<Readonly<Record<string, SharePreview>>>({}).pipe(Atom.keepAlive);

export const sharePreviewKey = (spaceId: string, objectId: string): string => `${spaceId}/${objectId}`;

/**
 * The {@link sharePreviewKey} a plank id addresses. Read off the id rather than matched whole, because a plank restored
 * from the link's URL keeps the URL's `<type>+<id>` segment until its node resolves under a different path.
 */
export const sharePreviewKeyOfNode = (nodeId: string): string | undefined => {
  const spaceId = GraphPath.getSpaceIdFromPath(nodeId);
  const objectId = nodeId.split('/').at(-1)?.split(UrlPath.TAIL_SEPARATOR).at(-1);
  return spaceId && objectId ? sharePreviewKey(spaceId, objectId) : undefined;
};

/** Retries while EDGE has not yet read the new invitation; the join behind it opens the object regardless. */
const READ_RETRIES = 4;

/**
 * Reads the objects the link's invitation shares from EDGE, proving possession of the invitation's guest key. Needs
 * no identity or client, so it runs while the app is still starting.
 */
export const readSharePreview = ({
  edgeUrl,
  spaceId,
  objectId,
  invitation,
}: {
  edgeUrl: string;
  spaceId: SpaceId;
  objectId: string;
  invitation: Invitation;
}): Effect.Effect<SharePreview | undefined, SpaceOperationError> =>
  Effect.gen(function* () {
    const secretKey = invitation.guestKeypair?.privateKey?.data;
    const publicKey = invitation.guestKeypair?.publicKey?.data;
    if (!secretKey || !publicKey) {
      return undefined;
    }

    const issuedAt = Date.now();
    const challenge = getSharedObjectsChallenge({ spaceId, invitationId: invitation.invitationId, issuedAt });
    const { objects } = yield* Effect.tryPromise({
      try: async () => {
        const { EdgeHttpClient } = await import('@dxos/edge-client');
        return new EdgeHttpClient(edgeUrl).readSharedObjects(
          Context.default(),
          spaceId,
          {
            invitationId: invitation.invitationId,
            issuedAt,
            signature: await signWithGuestKey(challenge, { secretKey, publicKey }),
          },
          { retry: { count: READ_RETRIES } },
        );
      },
      catch: (cause) => new SpaceOperationError({ message: 'The shared object could not be read from EDGE.', cause }),
    });

    return yield* decodeSharedObjects(spaceId, objectId, objects);
  });

/** Decodes the shared object, resolving its references to the other objects of the scope. */
export const decodeSharedObjects = (
  spaceId: SpaceId,
  objectId: string,
  objects: readonly SharedObject[],
): Effect.Effect<SharePreview | undefined, SpaceOperationError> =>
  Effect.gen(function* () {
    const resolver = new StaticRefResolver();
    const decoded = yield* Effect.forEach(objects, (object) =>
      Effect.tryPromise({
        try: () =>
          Obj.fromJSON(JSON.parse(object.documentJson), {
            refResolver: resolver,
            uri: EID.make({ spaceId, entityId: object.id }),
          }),
        catch: (cause) => new SpaceOperationError({ message: 'A shared object could not be decoded.', cause }),
      }),
    );
    // Added once all are decoded: a reference resolves on read, so its target need not exist when it is decoded.
    decoded.forEach((object) => resolver.addObject(object));
    const subject = decoded.find((object) => object.id === objectId);
    return subject && { subject };
  });

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
