//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const OUTLINER_PLUGIN = 'dxos.org/plugin/outliner';

export default {
  id: OUTLINER_PLUGIN,
  name: 'Outliner',
  description: 'Hierarchical note editor.',
  icon: 'ph--tree-structure--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/experimental/plugin-outliner',
  tags: ['experimental'],
} satisfies PluginMeta;
