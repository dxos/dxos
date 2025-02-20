//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const CANVAS_PLUGIN = 'dxos.org/plugin/canvas';

export const meta = {
  id: CANVAS_PLUGIN,
  name: 'Canvas',
  description: `Canvas allows you to build a node based compute graph that can handle complex workflows inside of Composer. Leverage your collaborative data along with custom scripts to orchestrate agentic workflows that operate in the background.`,
  icon: 'ph--infinity--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/experimental/plugin-canvas',
  tags: ['experimental'],
  screenshots: ['https://dxos.network/plugin-details-canvas-dark.png'],
} satisfies PluginMeta;
