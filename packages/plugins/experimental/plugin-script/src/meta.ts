//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const SCRIPT_PLUGIN = 'dxos.org/plugin/script';

export default {
  id: SCRIPT_PLUGIN,
  name: 'Scripts',
  description: 'Distributed functions.',
  icon: 'ph--code--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/experimental/plugin-explorer',
  tags: ['experimental'],
} satisfies PluginMeta;
