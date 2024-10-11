//
// Copyright 2023 DXOS.org
//

import { pluginMeta } from '@dxos/app-framework';

export const DEBUG_PLUGIN = 'dxos.org/plugin/debug';

export default pluginMeta({
  id: DEBUG_PLUGIN,
  name: 'Debug',
  description: 'DXOS debugging tools.',
  tags: ['experimental'],
  icon: 'ph--bug--regular',
});
