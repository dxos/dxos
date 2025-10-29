//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/conductor',
  name: 'Conductor',
  description: trim`
    Visual workflow builder using node-based compute graphs to orchestrate complex AI agent pipelines.
    Connect data sources, transformations, and AI models in a drag-and-drop interface for advanced automation.
  `,
  icon: 'ph--infinity--regular',
  iconHue: 'sky',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-conductor',
  tags: ['labs'],
  screenshots: ['https://dxos.network/plugin-details-canvas-dark.png'],
};
