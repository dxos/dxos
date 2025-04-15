//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const TRANSFORMER_PLUGIN = 'dxos.org/plugin/transformer';

export const meta: PluginMeta = {
  id: TRANSFORMER_PLUGIN,
  name: 'Transformer',
  description: 'Run local transformers.',
  icon: 'ph--cpu--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/experimental/plugin-transformer',
  tags: ['experimental'],
};
