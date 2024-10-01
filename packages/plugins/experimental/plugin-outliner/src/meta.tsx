//
// Copyright 2023 DXOS.org
//

import { pluginMeta } from '@dxos/app-framework';

export const OUTLINER_PLUGIN = 'dxos.org/plugin/outliner';

export default pluginMeta({
  id: OUTLINER_PLUGIN,
  name: 'Outliner',
  description: 'Hierarchical note editor.',
  tags: ['experimental'],
  icon: 'ph--tree-structure--regular',
});
