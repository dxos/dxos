//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const WNFS_PLUGIN = 'dxos.org/plugin/wnfs';

export const meta = {
  id: WNFS_PLUGIN,
  name: 'WNFS',
  description: 'Manage and view files with via the Web Native File System (WNFS).',
  icon: 'ph--file-cloud--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/experimental/plugin-wnfs',
} satisfies PluginMeta;
