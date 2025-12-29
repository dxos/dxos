//
// Copyright 2025 DXOS.org
//

import { Capability, Common, createResolver } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities } from '@dxos/plugin-client';

import { upload } from '../../helpers';
import { WnfsAction, WnfsCapabilities, WnfsFile } from '../../types';

export default Capability.makeModule((context) =>
  Capability.contributes(Common.Capability.IntentResolver, [
    // TODO(wittjosiah): Deleting the object doesn't delete the wnfs blob.
    //  Consider ways to trigger blob deletion based on object deletion and/or adding file system manager.
    createResolver({
      intent: WnfsAction.Create,
      resolve: ({ name, type, cid }) => ({
        data: {
          object: WnfsFile.make({ name, type, cid }),
        },
      }),
    }),
    createResolver({
      intent: WnfsAction.Upload,
      resolve: async ({ file, db }) => {
        const client = context.getCapability(ClientCapabilities.Client);
        const space = client.spaces.get(db.spaceId);
        invariant(space, 'Space not found');
        const blockstore = context.getCapability(WnfsCapabilities.Blockstore);
        const info = await upload({ file, blockstore, space });
        return { data: info };
      },
    }),
  ]),
);
