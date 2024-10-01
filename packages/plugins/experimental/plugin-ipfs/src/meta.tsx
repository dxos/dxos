//
// Copyright 2023 DXOS.org
//

import { pluginMeta } from '@dxos/app-framework';

export const IPFS_PLUGIN = 'dxos.org/plugin/ipfs';

export default pluginMeta({
  id: IPFS_PLUGIN,
  name: 'IPFS',
  description: 'Upload & view files with IPFS.',
  tags: ['experimental'],
  iconSymbol: 'ph--file-cloud--regular',
});
