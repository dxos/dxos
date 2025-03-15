//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver, type PluginsContext } from '@dxos/app-framework';
import { create } from '@dxos/react-client/echo';

import { WnfsCapabilities } from './capabilities';
import { upload } from '../helpers';
import { FileType, WnfsAction } from '../types';

export default (context: PluginsContext) =>
  contributes(Capabilities.IntentResolver, [
    // TODO(wittjosiah): Deleting the object doesn't delete the wnfs blob.
    //  Consider ways to trigger blob deletion based on object deletion and/or adding file system manager.
    createResolver({
      intent: WnfsAction.Create,
      resolve: ({ name, type, cid }) => ({
        data: {
          object: create(FileType, { name, type, cid }),
        },
      }),
    }),
    createResolver({
      intent: WnfsAction.Upload,
      resolve: async ({ file, space }) => {
        const blockstore = context.requestCapability(WnfsCapabilities.Blockstore);
        const info = await upload({ file, blockstore, space });
        return { data: info };
      },
    }),
  ]);
