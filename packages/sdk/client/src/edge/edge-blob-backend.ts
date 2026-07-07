//
// Copyright 2026 DXOS.org
//

import { Context } from '@dxos/context';
import { Blob } from '@dxos/echo';
import { digestHex, fromDigestHex } from '@dxos/echo-client/internal';
import { type BlobBackend } from '@dxos/echo-protocol';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';

export interface CreateEdgeBlobBackendOptions {
  edgeClient: EdgeHttpClient;
}

const parseNiUri = (uri: string): string => {
  invariant(uri.startsWith(`${Blob.Scheme.ni}:///`), `Invalid ni: URI: ${uri}`);
  return digestHex(uri);
};

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
export const createEdgeBlobBackend = ({ edgeClient }: CreateEdgeBlobBackendOptions): BlobBackend => ({
  schemes: [Blob.Scheme.ni],

  put: async ({ data, contentType, contentHash }) => {
    await edgeClient.putBlob(Context.default(), contentHash, data, { contentType });
    return { uri: fromDigestHex(contentHash) };
  },

  get: async ({ uri }) => edgeClient.getBlob(Context.default(), parseNiUri(uri)),

  has: async ({ uri }) => edgeClient.hasBlob(Context.default(), parseNiUri(uri)),

  getUrl: async ({ uri }) => edgeClient.getBlobUrl(parseNiUri(uri)).toString(),
});
