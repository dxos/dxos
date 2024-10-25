//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const FILES_PLUGIN = 'dxos.org/plugin/files';

export default {
  id: FILES_PLUGIN,
  name: 'Files',
  description: 'Open files from the local file system.',
  tags: ['experimental'],
  icon: 'ph--file--regular',
} satisfies PluginMeta;
