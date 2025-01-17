//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';

import { WnfsCapabilities } from './capabilities';
import { upload } from '../upload';

// TODO(burdon): Add intent to upload file.
export default (context: PluginsContext) => {
  const blockstore = context.requestCapability(WnfsCapabilities.Blockstore);

  return contributes(Capabilities.FileUploader, async (file, space) => {
    if (!blockstore) {
      throw new Error('Blockstore is not ready yet');
    }

    return await upload({ blockstore, file, space });
  });
};
