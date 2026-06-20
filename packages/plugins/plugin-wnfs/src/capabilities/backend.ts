//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities } from '@dxos/plugin-client';
import { FileCapabilities } from '@dxos/plugin-file/types';
import { File } from '@dxos/types';

import { WnfsCapabilities } from '#types';

import { upload } from '../helpers';

export const WNFS_BACKEND_ID = 'wnfs';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    return Capability.contributes(FileCapabilities.Backend, {
      id: WNFS_BACKEND_ID,
      name: 'WNFS',
      description: 'Decentralized, end-to-end encrypted storage via Web Native File System.',
      upload: async (file, db) => {
        const client = capabilities.get(ClientCapabilities.Client);
        const blockstore = capabilities.get(WnfsCapabilities.Blockstore);
        const instances = capabilities.get(WnfsCapabilities.Instances);
        const space = client.spaces.get(db.spaceId);
        invariant(space, 'Space not found');
        const info = await upload({ file, blockstore, instances, space });
        return {
          name: info.name,
          type: info.type,
          size: file.size,
          data: File.externalData(info.url, info.cid),
        };
      },
    });
  }),
);
