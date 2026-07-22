//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type { Blockstore } from 'interface-blockstore';

import { Capability } from '@dxos/app-framework';
import { type Client } from '@dxos/client';
import { type BlobBackend } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { FileCapabilities } from '@dxos/plugin-file/types';

import { WnfsCapabilities } from '#types';

import { getBlobUrl, loadWnfs, readWnfsFile, upload } from '../helpers';

interface CreateWnfsBlobBackendOptions {
  client: Client;
  blockstore: Blockstore;
  instances?: WnfsCapabilities.Instances;
}

/**
 * Blob backend that stores bytes in a space's WNFS private forest, addressed by `wnfs://…` URIs.
 * The underlying WASM bindings (`directory.read`) don't expose a distinct not-found error type, so
 * `readBytes`/`getUrl` can't tell a missing path from a genuine transport/blockstore failure —
 * both are logged and reported as a miss (`undefined`) rather than risk rethrowing on the common
 * missing-file path.
 */
export const createWnfsBlobBackend = ({ client, blockstore, instances }: CreateWnfsBlobBackendOptions): BlobBackend => {
  const readBytes = async (spaceId: SpaceId, uri: string) => {
    const space = client.spaces.get(spaceId);
    if (!space) {
      return undefined;
    }
    try {
      const { directory, forest } = await loadWnfs({ blockstore, instances, space });
      return await readWnfsFile({ wnfsUrl: uri, blockstore, forest, directory });
    } catch (error) {
      log.warn('failed to read wnfs blob', { spaceId, uri, error });
      return undefined;
    }
  };

  return {
    schemes: [WnfsCapabilities.WNFS_SCHEME],

    put: async ({ spaceId, data, contentType, contentHash, name }) => {
      const space = client.spaces.get(spaceId);
      invariant(space, 'Space not found');
      // `Uint8Array` is generic over `ArrayBufferLike` (incl. `SharedArrayBuffer`) while DOM's
      // `BlobPart` only covers `ArrayBuffer`-backed views — a gap between the DOM lib types and
      // the TS standard lib, not fixable by typing `data` differently.
      const file = new File([data as BlobPart], name ?? contentHash, { type: contentType });
      const info = await upload({ file, blockstore, instances, space });
      return { uri: info.url };
    },

    get: async ({ spaceId, uri }) => readBytes(spaceId, uri),

    has: async ({ spaceId, uri }) => (await readBytes(spaceId, uri)) !== undefined,

    getUrl: async ({ spaceId, uri, contentType }) => {
      const space = client.spaces.get(spaceId);
      if (!space) {
        return undefined;
      }
      try {
        const { directory, forest } = await loadWnfs({ blockstore, instances, space });
        return await getBlobUrl({ wnfsUrl: uri, blockstore, directory, forest, type: contentType });
      } catch (error) {
        log.warn('failed to resolve wnfs blob url', { spaceId, uri, error });
        return undefined;
      }
    },
  };
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const blockstore = yield* WnfsCapabilities.Blockstore;
    const instances = yield* WnfsCapabilities.Instances;

    const cleanup = client.graph.registerBlobBackend(
      WnfsCapabilities.WNFS_BACKEND,
      createWnfsBlobBackend({ client, blockstore, instances }),
    );

    return Capability.provide(
      FileCapabilities.Backend,
      {
        name: 'WNFS',
        description: 'Decentralized, end-to-end encrypted storage via Web Native File System.',
        storage: WnfsCapabilities.WNFS_BACKEND,
      },
      () => Effect.sync(() => cleanup()),
    );
  }),
);
