//
// Copyright 2026 DXOS.org
//

import { type SpaceId } from '@dxos/keys';

export interface BlobPutRequest {
  spaceId: SpaceId;
  data: Uint8Array;
  contentType?: string;
  /** Lowercase hex SHA-256 digest of `data`, computed by the manager. The backend does not verify it. */
  contentHash: string;
  /** For path-addressed extension backends. */
  name?: string;
}

export interface BlobPutResponse {
  /** URI locating the stored bytes; must use a scheme the backend resolves. */
  uri: string;
}

/**
 * Moves bytes to and from a content-addressed store, keyed by lowercase hex digest.
 *
 * Declared as its own interface so a backend can be built from anything that can move bytes — the
 * hosted service, a local cache, a test double — rather than from a client class. `EdgeHttpClient`
 * has 33 public methods spanning identity, queues, functions, workflows and the plugin registry; a
 * blob backend needs these four, and taking the class would drag in the other twenty-nine.
 *
 * Deliberately carries no `Context`: that is an edge-client concern, and threading it through here
 * would make this package depend on `@dxos/context` to pass a value the blob layer never reads. The
 * registration site adapts.
 */
export interface BlobTransport {
  /** Direct URL for the stored bytes, for `<img>`/`<video>` and other non-programmatic reads. */
  url(key: string): URL;
  put(key: string, data: Uint8Array, options?: { contentType?: string }): Promise<void>;
  /** `undefined` means the key was not found. */
  get(key: string): Promise<Uint8Array | undefined>;
  has(key: string): Promise<boolean>;
}

/**
 * Implemented by pluggable blob storage backends and registered on the Hypergraph via
 * `registerBlobBackend`.
 *
 * A backend takes the capabilities it needs rather than a client — see `BlobTransport` for the
 * hosted store and `S3Host` for S3 — so it can be registered in a browser, in a headless worker, or
 * in a test without a client graph behind it.
 */
export interface BlobBackend {
  /** URI schemes this backend resolves at read time. */
  readonly schemes: readonly string[];
  /** Largest `data.byteLength` this backend accepts, in bytes. `undefined` means unlimited. */
  readonly maxSize?: number;
  put(request: BlobPutRequest): Promise<BlobPutResponse>;
  /** `undefined` means the URI was not found. Rejects on transport failure (e.g. offline). */
  get(request: { spaceId: SpaceId; uri: string }): Promise<Uint8Array | undefined>;
  has(request: { spaceId: SpaceId; uri: string }): Promise<boolean>;
  getUrl?(request: { spaceId: SpaceId; uri: string; contentType?: string }): Promise<string | undefined>;
}
