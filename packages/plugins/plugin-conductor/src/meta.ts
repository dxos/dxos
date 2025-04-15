//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const CONDUCTOR_PLUGIN = 'dxos.org/plugin/conductor';

export const meta: PluginMeta = {
  id: CONDUCTOR_PLUGIN,
  name: 'Conductor',
  description:
    'Conductor allows you to build a node based compute graph that can handle complex workflows inside of Composer. Leverage your collaborative data along with custom scripts to orchestrate agentic workflows that operate in the background.',
  icon: 'ph--infinity--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/experimental/plugin-conductor',
  tags: ['experimental'],
  screenshots: ['https://dxos.network/plugin-details-canvas-dark.png'],
};
