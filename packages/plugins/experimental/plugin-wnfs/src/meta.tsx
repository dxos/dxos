//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const WNFS_PLUGIN = 'dxos.org/plugin/WNFS';

export default {
  id: WNFS_PLUGIN,
  name: 'WNFS',
  description: 'Upload & view files with WNFS.',
  tags: ['experimental'],
  icon: 'ph--file-cloud--regular',
} satisfies PluginMeta;
