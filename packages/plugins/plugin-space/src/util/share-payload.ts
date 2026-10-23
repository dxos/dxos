//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { InvalidSharePayloadError } from '../errors.ts';

/**
 * What an object share link carries beyond the object's path: how to join, what to replicate and what to render it
 * with. See `.agents/projects/object-share/DESIGN.md` §3.
 */
export const SharePayload = Schema.Struct({
  v: Schema.Literal(1),
  spaceId: Schema.String,
  /** The shared object. */
  objectId: Schema.String,
  /** The shared object's type as a graph path segment, so the recipient can open it before its type is registered. */
  typeSlug: Schema.String,
  /** Encoded delegated space invitation; absent for a link only members can open. */
  invitation: Schema.optional(Schema.String),
  /** Plugins that render the objects in scope. */
  plugins: Schema.Array(Schema.String),
  /** Objects a non-member replicates: the shared object first, then what it needs. */
  objects: Schema.Array(Schema.String),
});
export interface SharePayload extends Schema.Schema.Type<typeof SharePayload> {}

const decodePayload = Schema.decodeUnknownEffect(Schema.fromJsonString(SharePayload));

/** Deflates and base64url-encodes a payload for a URL query parameter. */
export const encodeSharePayload = (payload: SharePayload): Effect.Effect<string> =>
  Effect.promise(() =>
    transform(new TextEncoder().encode(JSON.stringify(payload)), new CompressionStream('deflate-raw')),
  ).pipe(Effect.map(toBase64Url));

/** Reverses {@link encodeSharePayload}, failing on anything that is not a payload this version reads. */
export const decodeSharePayload = (encoded: string): Effect.Effect<SharePayload, InvalidSharePayloadError> =>
  Effect.tryPromise({
    try: () => transform(fromBase64Url(encoded), new DecompressionStream('deflate-raw')),
    catch: (cause) => new InvalidSharePayloadError({ cause }),
  }).pipe(
    Effect.flatMap((bytes) => decodePayload(new TextDecoder().decode(bytes))),
    Effect.mapError((cause) =>
      cause instanceof InvalidSharePayloadError ? cause : new InvalidSharePayloadError({ cause }),
    ),
  );

const transform = async (
  bytes: Uint8Array<ArrayBuffer>,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array<ArrayBuffer>> =>
  new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());

const toBase64Url = (bytes: Uint8Array): string =>
  btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');

const fromBase64Url = (encoded: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(encoded.replaceAll('-', '+').replaceAll('_', '/')), (char) => char.charCodeAt(0));
