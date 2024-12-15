//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const CANVAS_PLUGIN = 'dxos.org/plugin/canvas';

export default {
  id: CANVAS_PLUGIN,
  name: 'Grid',
  description: 'Place objects as cards on a grid.',
  icon: 'ph--infinity--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/experimental/plugin-canvas',
  tags: ['experimental'],
} satisfies PluginMeta;
