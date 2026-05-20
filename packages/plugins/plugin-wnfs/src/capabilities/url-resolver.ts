//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { FileCapabilities } from '@dxos/plugin-file/types';

import { WnfsCapabilities } from '#types';

import { getBlobUrl, loadWnfs } from '../helpers';

export const WNFS_URL_RESOLVER_ID = 'wnfs';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    return Capability.contributes(FileCapabilities.UrlResolver, {
      id: WNFS_URL_RESOLVER_ID,
      test: (url) => url.startsWith('wnfs://'),
      resolve: async (wnfsUrl, file, space) => {
        if (!space) {
          return undefined;
        }
        try {
          const blockstore = capabilities.get(WnfsCapabilities.Blockstore);
          const instances = capabilities.get(WnfsCapabilities.Instances);
          const { directory, forest } = await loadWnfs({ blockstore, instances, space });
          return await getBlobUrl({
            wnfsUrl,
            blockstore,
            directory,
            forest,
            type: file.type,
          });
        } catch {
          return undefined;
        }
      },
    });
  }),
);
