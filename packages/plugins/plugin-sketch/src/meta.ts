//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const SKETCH_PLUGIN = 'dxos.org/plugin/sketch';

export const meta = {
  id: SKETCH_PLUGIN,
  name: 'Sketch',
  description: `The Sketch plugin allows you to leverage a digital whiteboard and diagram editor powered by TLDraw.`,
  icon: 'ph--compass-tool--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-sketch',
  screenshots: ['https://dxos.network/plugin-details-sketch-dark.png'],
} satisfies PluginMeta;
