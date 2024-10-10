//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const CHAIN_PLUGIN = 'dxos.org/plugin/chain';

export default {
  id: CHAIN_PLUGIN,
  name: 'Chain',
  description: 'AI prompt configuration.',
  tags: ['experimental'],
  icon: 'ph--head-circuit--regular',
} satisfies PluginMeta;
