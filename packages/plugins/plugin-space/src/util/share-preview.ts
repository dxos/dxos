//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';
import type * as AtomRegistry from 'effect/reactivity/AtomRegistry';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as UrlPath from '@dxos/app-toolkit/UrlPath';
import { Context } from '@dxos/context';
import { Annotation, Obj, Type } from '@dxos/echo';
import { PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { getSharedObjectsChallenge } from '@dxos/protocols';
import { type Invitation } from '@dxos/protocols/buf/dxos/client/invitation_pb';

import { SpaceOperationError } from '../operations/errors.ts';
import type { ThinClient, ThinClientOptions } from './thin-client.ts';

/**
 * A share link's first look: the shared object, live in a read-only {@link ThinClient} served from the documents EDGE
 * handed over, until the space is joined and the full client's object replaces it.
 */
export type SharePreview = {
  subject: Obj.Unknown;
  client: ThinClient;
};

/**
 * A first look's title and icon. A type the thin client was not given has no schema there, so they come from the
 * type with its typename among `types`, the types the enabled plugins contribute.
 */
export const getSharePreviewHeading = (
  subject: Obj.Unknown,
  types: readonly Type.AnyEntity[],
): AppSurface.PendingHeading | undefined => {
  const typename = Obj.getTypename(subject);
  const type = types.find((candidate) => Type.getTypename(candidate) === typename);
  const schema = type && Type.getSchema(type);
  const label = Obj.getLabel(subject) ?? (schema && Annotation.getLabelWithSchema(schema, subject));
  if (!label) {
    return undefined;
  }
  const icon = schema && Option.getOrUndefined(Annotation.IconAnnotation.get(schema));
  return { label, icon: (Obj.getIcon(subject) ?? icon)?.icon };
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
 * Reads the documents the link's invitation shares from EDGE, proving possession of the invitation's guest key, and
 * opens the shared object from them in a {@link ThinClient}. Needs no identity or full client, so it runs while the
 * app is still starting.
 */
export const readSharePreview = ({
  edgeUrl,
  spaceId,
  objectId,
  invitation,
  types,
}: {
  edgeUrl: string;
  spaceId: SpaceId;
  objectId: string;
  invitation: Invitation;
  types: readonly Type.AnyEntity[];
}): Effect.Effect<SharePreview | undefined, SpaceOperationError> =>
  Effect.gen(function* () {
    const secretKey = invitation.guestKeypair?.privateKey?.data;
    const publicKey = invitation.guestKeypair?.publicKey?.data;
    const spaceKey = invitation.spaceKey?.data;
    if (!secretKey || !publicKey || !spaceKey) {
      return undefined;
    }

    const issuedAt = Date.now();
    const challenge = getSharedObjectsChallenge({ spaceId, invitationId: invitation.invitationId, issuedAt });
    const { objects, documents } = yield* Effect.tryPromise({
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

    return yield* openSharePreview({
      spaceId,
      spaceKey: PublicKey.from(spaceKey),
      objectId,
      objects,
      documents,
      types,
    });
  });

/** Opens the shared object in a {@link ThinClient}; `undefined` when EDGE handed over no document for it. */
const openSharePreview = ({
  objectId,
  ...options
}: ThinClientOptions & { objectId: string }): Effect.Effect<SharePreview | undefined, SpaceOperationError> =>
  Effect.tryPromise({
    try: async () => {
      // Loaded on demand: the thin client brings Automerge and the functions' handlers, which boot never needs.
      const { ThinClient } = await import('./thin-client.ts');
      const client = new ThinClient(options);
      await client.open();
      const subject = await client.load(objectId);
      if (!subject) {
        await client.close();
        return undefined;
      }
      return { subject, client };
    },
    catch: (cause) => new SpaceOperationError({ message: 'The shared object could not be opened.', cause }),
  });

/** How many stand-ins show each first look, so the last one gone closes its client. */
const shown = new Map<string, number>();

/**
 * Marks the first look under `key` as on screen; the returned function marks it gone. When no stand-in shows it any
 * more, its plank has the full client's object, so the first look is dropped and its thin client closed.
 */
export const retainSharePreview = (registry: AtomRegistry.AtomRegistry, key: string): (() => void) => {
  shown.set(key, (shown.get(key) ?? 0) + 1);
  return () => {
    shown.set(key, (shown.get(key) ?? 1) - 1);
    // Deferred, since a remount (React's development double-mount, or the plank moving to its canonical id) releases
    // before it retains again.
    queueMicrotask(() => {
      if ((shown.get(key) ?? 0) > 0) {
        return;
      }
      shown.delete(key);
      const preview = registry.get(sharePreviewsAtom)[key];
      if (!preview) {
        return;
      }
      registry.update(sharePreviewsAtom, ({ [key]: _released, ...rest }) => rest);
      void preview.client.close().catch((error) => log.warn('share link thin client not closed', { error }));
    });
  };
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
