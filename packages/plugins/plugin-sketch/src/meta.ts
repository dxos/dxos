//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const SKETCH_PLUGIN = 'dxos.org/plugin/sketch';

export const meta: PluginMeta = {
  id: SKETCH_PLUGIN,
  name: 'Sketch',
  description: 'The Sketch plugin implements a digital whiteboard and diagram editor.',
  icon: 'ph--compass-tool--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-sketch',
  screenshots: ['https://dxos.network/plugin-details-sketch-dark.png'],
};
