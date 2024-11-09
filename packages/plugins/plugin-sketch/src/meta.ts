//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const SKETCH_PLUGIN = 'dxos.org/plugin/sketch';

export default {
  id: SKETCH_PLUGIN,
  name: 'Sketch',
  description: 'Digital whiteboard and diagram editor.',
  icon: 'ph--compass-tool--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-sketch',
} satisfies PluginMeta;
