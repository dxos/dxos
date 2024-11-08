//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const IPFS_PLUGIN = 'dxos.org/plugin/ipfs';

export default {
  id: IPFS_PLUGIN,
  name: 'IPFS',
  description: 'Upload & view files with IPFS.',
  icon: 'ph--file-cloud--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/experimental/plugin-ipfs',
  tags: ['experimental'],
} satisfies PluginMeta;
