//
// Copyright 2026 DXOS.org
//

import { Context } from '@dxos/context';
import { Blob } from '@dxos/echo';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';

export interface CreateEdgeBlobBackendOptions {
  edgeClient: EdgeHttpClient;
}

const parseSha256Uri = (uri: string): string => {
  const [scheme, hash] = uri.split(':');
  invariant(scheme === Blob.Scheme.sha256 && hash, `Invalid sha256 URI: ${uri}`);
  return hash;
};

/**
 * Blob backend that stores bytes in the edge blob service, addressed by content hash as
 * `sha256:<hex>` URIs — a plain digest, not a multiformats CID (the edge blob service itself is a
 * flat key-value store with no notion of either). Online-only in v1 — reads and writes reject if
 * the edge is unreachable; there is no local cache.
 *
 * TODO(wittjosiah): Add a local cache (e.g. via `@dxos/random-access-storage`, keyed by content
 * hash) so reads/writes don't always round-trip to the edge. Blocked on `Blob.Backend` gaining a
 * `remove` and GC/refcounting for content-addressed blobs — without that, a local cache has no way
 * to know when a cached entry is safe to evict once its owning Blob object is deleted.
 */
export const createEdgeBlobBackend = ({ edgeClient }: CreateEdgeBlobBackendOptions): Blob.Backend => ({
  schemes: [Blob.Scheme.sha256],

  put: async ({ data, contentType, contentHash }) => {
    await edgeClient.putBlob(Context.default(), contentHash, data, { contentType });
    return { uri: `${Blob.Scheme.sha256}:${contentHash}` };
  },

  get: async ({ uri }) => edgeClient.getBlob(Context.default(), parseSha256Uri(uri)),

  has: async ({ uri }) => edgeClient.hasBlob(Context.default(), parseSha256Uri(uri)),

  getUrl: async ({ uri }) => new URL(`/api/file/${parseSha256Uri(uri)}`, edgeClient.baseUrl).toString(),
});
