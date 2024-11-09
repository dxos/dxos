//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const WNFS_PLUGIN = 'dxos.org/plugin/WNFS';

export default {
  id: WNFS_PLUGIN,
  name: 'WNFS',
  description: 'Upload & view files with WNFS.',
  icon: 'ph--file-cloud--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/experimental/plugin-wnfs',
  tags: ['experimental'],
} satisfies PluginMeta;
