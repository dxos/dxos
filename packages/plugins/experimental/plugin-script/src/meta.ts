//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const SCRIPT_PLUGIN = 'dxos.org/plugin/script';

export default {
  id: SCRIPT_PLUGIN,
  name: 'Scripts',
  description: 'Distributed functions.',
  tags: ['experimental'],
  icon: 'ph--code--regular',
} satisfies PluginMeta;
