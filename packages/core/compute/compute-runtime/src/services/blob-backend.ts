//
// Copyright 2026 DXOS.org
//

import { type BlobBackend, SCHEME, digestHex, fromDigestHex } from '@dxos/blob';
import { invariant } from '@dxos/invariant';
import { type EdgeFunctionEnv } from '@dxos/protocols';

/**
 * Blob backend over a function host's content-addressed blob store, addressed by RFC 6920 `ni:`
 * URIs — the same addressing `createEdgeBlobBackend` uses for the client, so bytes written by a
 * function and by the app are interchangeable.
 *
 * No `getUrl`: the store is reached over a service binding, which has no public URL to hand a
 * renderer. A caller that needs one resolves the bytes and builds an object URL itself.
 *
 * @see {@link https://www.rfc-editor.org/rfc/rfc6920 RFC 6920}
 */
export const blobBackendFromService = (service: EdgeFunctionEnv.BlobService): BlobBackend => {
  const keyOf = (uri: string): string => {
    invariant(uri.startsWith(`${SCHEME}:///`), `Invalid ni: URI: ${uri}`);
    return digestHex(uri);
  };

  return {
    schemes: [SCHEME],
    put: async ({ data, contentType, contentHash }) => {
      await service.put({}, contentHash, data, { contentType });
      return { uri: fromDigestHex(contentHash) };
    },
    get: async ({ uri }) => service.get({}, keyOf(uri)),
    has: async ({ uri }) => service.has({}, keyOf(uri)),
  };
};
