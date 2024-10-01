//
// Copyright 2023 DXOS.org
//

import { pluginMeta } from '@dxos/app-framework';

export const SCRIPT_PLUGIN = 'dxos.org/plugin/script';

export default pluginMeta({
  id: SCRIPT_PLUGIN,
  name: 'Scripts',
  description: 'Distributed functions.',
  tags: ['experimental'],
  icon: 'ph--code--regular',
});
