//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { DXN } from '@dxos/keys';

import * as Annotation from './Annotation';
import * as Database from './Database';
import * as Err from './Err';
import * as internal from './internal';
import * as Obj from './Obj';
import * as Type from './Type';

/**
 * Inline blob data: bytes stored directly on the ECHO object.
 */
export const InlineData = Schema.TaggedStruct('inline', {
  bytes: Schema.Uint8ArrayFromSelf.annotations({ jsonSchema: { type: 'string', contentEncoding: 'base64' } }),
});

/**
 * External blob data: bytes stored by a registered blob backend, addressed by `uri`.
 */
export const ExternalData = Schema.TaggedStruct('external', {
  /**
   * URI locating the bytes. The scheme selects the backend at read time (e.g. `ni:///sha-256;…` for
   * the edge backend — an RFC 6920 content digest, not a backend name — or `wnfs://…` for the
   * plugin-wnfs extension), resolved via the scheme→backend map built from `registerBlobBackend`
   * calls. Core code never parses or constructs backend-specific URIs beyond reading the scheme.
   *
   * @see {@link https://www.rfc-editor.org/rfc/rfc6920 RFC 6920} for the `ni:` URI format.
   */
  uri: Schema.String,
});

export const BlobData = Schema.Union(InlineData, ExternalData);
export type BlobData = Schema.Schema.Type<typeof BlobData>;

/**
 * Runtime schema for a Blob object.
 *
 * NOTE: This export shadows the DOM `Blob` global within modules that import it as a namespace.
 * Code that needs the DOM class should use `globalThis.Blob` explicitly.
 *
 * @example
 * ```ts
 * const blob = yield* Blob.fromBytes(bytes, { type: 'image/png' });
 * ```
 */
export class Blob extends Type.makeObject<Blob>(DXN.make('org.dxos.type.blob', '0.1.0'))(
  Schema.Struct({
    /** MIME type. */
    type: Schema.optional(Schema.String),
    size: Schema.Number,
    data: BlobData,
  }).pipe(
    internal.HiddenAnnotation.set(true),
    Annotation.IconAnnotation.set({ icon: 'ph--file--regular', hue: 'teal' }),
  ),
) {}

//
// Storage constants
//

/**
 * Storage backend names, selected at write time via {@link FromBytesOptions.storage}. Call sites
 * always use these constants, never raw string literals. Extensions (e.g. plugin-wnfs) define
 * their own storage names in their own package — core code knows nothing of them.
 *
 * Distinct from {@link Scheme}: a storage name picks *where* to write, a URI scheme describes
 * *what the identifier is* at read time. They coincide for backends with no content-addressing
 * (e.g. wnfs uses `'wnfs'` for both), but the edge backend's storage name (`'edge'`) differs from
 * its URI scheme (`Scheme.ni`) because the identifier it produces is a content hash, not an
 * edge-specific address.
 */
export const Storage = { inline: 'inline', edge: 'edge' } as const;
export type Storage = (typeof Storage)[keyof typeof Storage];

/**
 * URI schemes claimed by core backends (see `BlobBackend.schemes` in `@dxos/echo-protocol`).
 *
 * `ni` marks an {@link https://www.rfc-editor.org/rfc/rfc6920 RFC 6920} Named Information URI whose
 * authority is empty and whose path carries a registered hash-algorithm name plus a base64url-encoded
 * digest (e.g. `ni:///sha-256;UyaQNQIUxQKgg1jVMKMbg1Yr8Rrb2Y3RaOx2N0mVJhc`, produced by the edge
 * backend). The scheme names *what the identifier is* — a content digest over the complete blob —
 * not which backend wrote it, so any backend or cache that can resolve that digest may claim it.
 * The URI is an identity claim, not a retrievability promise; transport is selected by the registered
 * backend at read time.
 *
 * Extensions (e.g. plugin-wnfs) define their own schemes in their own package.
 */
export const Scheme = { ni: 'ni' } as const;
export type Scheme = (typeof Scheme)[keyof typeof Scheme];

//
// Factory
//

export const MAX_INLINE_SIZE = 4 * 1024 * 1024;

/**
 * Creates a new blob object. Does not add it to the database — see {@link fromBytes}.
 */
export const make = (props: Obj.MakeProps<typeof Blob>): Blob => Obj.make(Blob, props);

/**
 * Creates an inline {@link BlobData} variant that embeds raw bytes on the ECHO object.
 */
export const inlineData = (bytes: Uint8Array): BlobData => ({ _tag: 'inline', bytes });

/**
 * Creates an external {@link BlobData} variant that references bytes held by a registered backend.
 * @param uri - Backend-scoped URI, e.g. as returned by a `BlobBackend.put` call.
 */
export const externalData = (uri: string): BlobData => ({ _tag: 'external', uri });

export interface FromBytesOptions {
  /** MIME type. */
  type?: string;
  /**
   * Storage backend name. Defaults to the registry's configured default (initially `'inline'`;
   * `@dxos/client` marks `'edge'` as the default when configured).
   */
  storage?: Storage | (string & {});
}

//
// Operations
//

/**
 * Hashes and uploads `bytes` via the chosen storage backend (a no-op for `inline`), returning an
 * un-added Blob object. The caller is responsible for adding it to the database.
 *
 * @example
 * ```ts
 * const blob = yield* Blob.fromBytes(bytes, { type: 'image/png' });
 * yield* Database.add(blob);
 * ```
 */
export const fromBytes = (
  bytes: Uint8Array,
  options?: FromBytesOptions,
): Effect.Effect<Blob, Err.BlobTooLargeError | Err.BlobWriteError, Database.Service> =>
  Database.Service.pipe(
    Effect.flatMap(({ db }) =>
      Effect.tryPromise({
        try: () => db.createBlob(bytes, options),
        catch: (error) =>
          error instanceof Err.BlobTooLargeError || error instanceof Err.BlobWriteError
            ? error
            : new Err.BlobWriteError({ backend: options?.storage ?? 'unknown' }, { cause: error }),
      }),
    ),
  ).pipe(Effect.withSpan('Blob.fromBytes'));

/**
 * Loads a blob's bytes. Inline: read directly off the object. External: dispatched to the
 * registered backend for the URI's scheme.
 *
 * @example
 * ```ts
 * const bytes = yield* Blob.read(blob);
 * ```
 */
export const read = (blob: Blob): Effect.Effect<Uint8Array, Err.BlobNotAvailableError, Database.Service> =>
  Database.Service.pipe(
    Effect.flatMap(({ db }) =>
      Effect.tryPromise({
        try: () => db.readBlob(blob),
        catch: (error) =>
          error instanceof Err.BlobNotAvailableError
            ? error
            : new Err.BlobNotAvailableError(
                { backend: 'unknown', key: blob.id, reason: 'not-found' },
                { cause: error },
              ),
      }),
    ),
  ).pipe(Effect.withSpan('Blob.read'));

/**
 * Checks whether a blob's bytes are currently available.
 */
export const exists = (blob: Blob): Effect.Effect<boolean, never, Database.Service> =>
  Database.Service.pipe(Effect.flatMap(({ db }) => Effect.promise(() => db.blobExists(blob)))).pipe(
    Effect.withSpan('Blob.exists'),
  );

/**
 * Returns a renderable URL for the blob: inline blobs resolve to a `data:` URL; external blobs
 * are resolved by the registered backend's `getUrl`, if it implements one.
 */
export const url = (blob: Blob): Effect.Effect<Option.Option<string>, never, Database.Service> =>
  Database.Service.pipe(
    Effect.flatMap(({ db }) => Effect.promise(() => db.getBlobUrl(blob))),
    Effect.map(Option.fromNullable),
  ).pipe(Effect.withSpan('Blob.url'));
