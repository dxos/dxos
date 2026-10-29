//
// Copyright 2026 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { type BlobBackend, type BlobStore, type BlobTransport } from '../backend.ts';
import { SCHEME, digestHex, fromDigestHex } from '../ni-uri.ts';

export interface CreateEdgeBlobBackendOptions {
  /** The store on this device; every read and write goes here and nowhere else. */
  store: BlobStore;
  /** Adopts a direct upload made to the hosted store; absent when no EDGE endpoint is configured. */
  finalizeUpload?: BlobTransport['finalizeUpload'];
}

/** {@link BlobBackend} whose bytes are held on this device. */
export interface EdgeBlobBackend extends BlobBackend {
  /** Always present: local bytes can be rendered without the network. */
  getUrl: NonNullable<BlobBackend['getUrl']>;
  /** Revokes the object URLs `getUrl` handed out. */
  close(): void;
}

// `SCHEME` from `ni-uri` rather than `Blob.Scheme.ni` from `@dxos/echo`: both are the string `ni`,
// and taking it from here is what keeps this package below `@dxos/echo` in the graph. `@dxos/echo`
// exposes `registerBlobBackend(...: BlobBackend)`, so anything it depends on cannot depend back on it.
const parseNiUri = (uri: string): string => {
  invariant(uri.startsWith(`${SCHEME}:///`), `Invalid ni: URI: ${uri}`);
  return digestHex(uri);
};

/** Largest blob the edge blob service accepts, in bytes. */
export const MAX_EDGE_BLOB_SIZE = 50 * 1024 * 1024;

/**
 * Local-first blob backend addressed by RFC 6920 `ni:` URIs over a SHA-256 digest of the complete
 * blob.
 *
 * A write is confirmed once the {@link BlobStore} on this device holds it; the backend never talks to
 * the edge blob service for reads or writes. Replication is the store's concern - in the client, the
 * client services host pushes stored blobs to the edge asynchronously (see `createBlobReplicator`) and
 * fills local misses from it.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc6920 RFC 6920}
 */
export const createEdgeBlobBackend = ({ store, finalizeUpload }: CreateEdgeBlobBackendOptions): EdgeBlobBackend => {
  const objectUrls = new Map<string, string>();

  return {
    schemes: [SCHEME],
    maxSize: MAX_EDGE_BLOB_SIZE,

    put: async ({ data, contentType, contentHash }) => {
      await store.put(contentHash, data, { contentType });
      return { uri: fromDigestHex(contentHash) };
    },

    get: async ({ uri }) => (await store.get(parseNiUri(uri)))?.data,

    has: async ({ uri }) => store.has(parseNiUri(uri)),

    getUrl: async ({ uri, contentType }) => {
      const key = parseNiUri(uri);
      // Keyed by type as well: identical bytes stored under two declared types must render as each.
      const cacheKey = `${key}|${contentType ?? ''}`;
      const existing = objectUrls.get(cacheKey);
      if (existing) {
        return existing;
      }
      const blob = await store.get(key);
      if (!blob) {
        return undefined;
      }
      // An object URL over the local bytes, so the blob renders offline.
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(blob.data)], { type: contentType ?? blob.contentType ?? '' }),
      );
      objectUrls.set(cacheKey, url);
      return url;
    },

    // Spread rather than always present: `adoptUpload` being absent is how the manager tells a
    // backend that cannot adopt uploads from an adoption that failed.
    ...(finalizeUpload && {
      adoptUpload: async ({ uploadId }: { uploadId: string }) => {
        // Not copied here: the bytes were uploaded straight to the edge, and the first read fills them.
        const { key, size, contentType } = await finalizeUpload(uploadId);
        return { uri: fromDigestHex(key), size, contentType };
      },
    }),

    close: () => {
      for (const url of objectUrls.values()) {
        URL.revokeObjectURL(url);
      }
      objectUrls.clear();
    },
  };
};
