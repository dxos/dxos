//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as UrlPath from '@dxos/app-toolkit/UrlPath';

import { InvalidSharePayloadError } from '../errors.ts';

/**
 * What an object share link carries beyond its path, which names the object it opens: how to join, what to replicate
 * and what to render it with. See plugin-space's `spec/OBJECT-SHARE.mdl`.
 */
export const SharePayload = Schema.Struct({
  version: Schema.Literal(1),
  spaceId: Schema.String,
  /**
   * The delegated space invitation as protobuf JSON (`InvitationEncoder.toJson`) rather than a code, since the
   * payload is encoded already; absent for a link only members can open.
   */
  invitation: Schema.optional(Schema.Record(Schema.String, Schema.MutableJson)),
  /** Plugins that render the objects in scope. */
  plugins: Schema.Array(Schema.String),
  /** Objects a non-member replicates: the object the link opens and what it needs. */
  objects: Schema.Array(Schema.String),
});
export interface SharePayload extends Schema.Schema.Type<typeof SharePayload> {}

/** The object a share link opens, read off the link's path, which is the object's shareable path. */
export type ShareTarget = {
  objectId: string;
  /** The type segment the object is filed under, so the recipient can open it before its type is registered. */
  typeSlug: string;
};

/** The last object the link's path names, as `<typeSlug>+<objectId>`; undefined for a path that names none. */
export const readShareTarget = (url: URL): ShareTarget | undefined => {
  const objectId = UrlPath.readReferences(url.pathname).at(-1)?.entityId;
  const segment =
    objectId && url.pathname.split('/').findLast((part) => part.endsWith(`${UrlPath.TAIL_SEPARATOR}${objectId}`));
  return segment ? { objectId, typeSlug: decodeURIComponent(segment.slice(0, -objectId.length - 1)) } : undefined;
};

const decodePayload = Schema.decodeUnknownEffect(Schema.fromJsonString(SharePayload));

/** Deflates and base64url-encodes a payload for a URL query parameter. */
export const encodeSharePayload = (payload: SharePayload): Effect.Effect<string> =>
  Effect.promise(() =>
    transform(new TextEncoder().encode(JSON.stringify(payload)), new CompressionStream('deflate-raw')),
  ).pipe(Effect.map(toBase64Url));

/** Reverses {@link encodeSharePayload}, failing on anything that is not a payload this version reads. */
export const decodeSharePayload = (encoded: string): Effect.Effect<SharePayload, InvalidSharePayloadError> =>
  Effect.tryPromise({
    try: () => transform(fromBase64Url(encoded), new DecompressionStream('deflate-raw'), MAX_DECODED_BYTES),
    catch: (cause) => new InvalidSharePayloadError({ cause }),
  }).pipe(
    Effect.flatMap((bytes) => decodePayload(new TextDecoder().decode(bytes))),
    Effect.mapError((cause) =>
      cause instanceof InvalidSharePayloadError ? cause : new InvalidSharePayloadError({ cause }),
    ),
  );

/** Most bytes a link's payload may inflate to; real ones are a few KB, and a crafted one could otherwise fill the tab's memory. */
const MAX_DECODED_BYTES = 256 * 1024;

const transform = async (
  bytes: Uint8Array<ArrayBuffer>,
  stream: CompressionStream | DecompressionStream,
  maxBytes = Infinity,
): Promise<Uint8Array<ArrayBuffer>> => {
  const reader = new Blob([bytes]).stream().pipeThrough(stream).getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  for (let next = await reader.read(); !next.done; next = await reader.read()) {
    size += next.value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error(`Share payload inflates past ${maxBytes} bytes.`);
    }
    chunks.push(next.value);
  }
  return new Uint8Array(await new Blob(chunks).arrayBuffer());
};

const toBase64Url = (bytes: Uint8Array): string =>
  btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');

const fromBase64Url = (encoded: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(atob(encoded.replaceAll('-', '+').replaceAll('_', '/')), (char) => char.charCodeAt(0));
