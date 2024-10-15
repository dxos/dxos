//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const OUTLINER_PLUGIN = 'dxos.org/plugin/outliner';

export default {
  id: OUTLINER_PLUGIN,
  name: 'Outliner',
  description: 'Hierarchical note editor.',
  tags: ['experimental'],
  icon: 'ph--tree-structure--regular',
} satisfies PluginMeta;
