//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const FILES_PLUGIN = 'dxos.org/plugin/files';

export default {
  id: FILES_PLUGIN,
  name: 'Files',
  description: 'Open files from the local file system.',
  icon: 'ph--file--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-files',
  tags: ['experimental'],
} satisfies PluginMeta;
