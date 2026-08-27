//
// Copyright 2026 DXOS.org
//

import { type BlobBackend, type BlobTransport } from '@dxos/blob';
import { Blob } from '@dxos/echo';
import { digestHex, fromDigestHex } from '@dxos/echo-client/internal';
import { invariant } from '@dxos/invariant';

export interface CreateEdgeBlobBackendOptions {
  transport: BlobTransport;
}

const parseNiUri = (uri: string): string => {
  invariant(uri.startsWith(`${Blob.Scheme.ni}:///`), `Invalid ni: URI: ${uri}`);
  return digestHex(uri);
};

/** Largest blob the edge blob service accepts, in bytes. */
export const MAX_EDGE_BLOB_SIZE = 50 * 1024 * 1024;

/**
 * Blob backend that stores bytes in the edge blob service, addressed by RFC 6920 `ni:` URIs over a
 * SHA-256 digest of the complete blob. The edge blob service itself is a flat key-value store keyed
 * by hex digest — online-only in v1; reads and writes reject if the edge is unreachable and there is
 * no local cache.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc6920 RFC 6920}
 *
 * TODO(wittjosiah): Add a local cache (e.g. via `@dxos/random-access-storage`, keyed by content
 * hash) so reads/writes don't always round-trip to the edge. Blocked on `BlobBackend` gaining a
 * `remove` and GC/refcounting for content-addressed blobs — without that, a local cache has no way
 * to know when a cached entry is safe to evict once its owning Blob object is deleted.
 */
export const createEdgeBlobBackend = ({ transport }: CreateEdgeBlobBackendOptions): BlobBackend => ({
  schemes: [Blob.Scheme.ni],
  maxSize: MAX_EDGE_BLOB_SIZE,

  put: async ({ data, contentType, contentHash }) => {
    await transport.put(contentHash, data, { contentType });
    return { uri: fromDigestHex(contentHash) };
  },

  get: async ({ uri }) => transport.get(parseNiUri(uri)),

  has: async ({ uri }) => transport.has(parseNiUri(uri)),

  getUrl: async ({ uri }) => transport.url(parseNiUri(uri)).toString(),
});
