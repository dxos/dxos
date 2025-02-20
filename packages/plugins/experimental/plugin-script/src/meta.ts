//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const SCRIPT_PLUGIN = 'dxos.org/plugin/script';

export const meta = {
  id: SCRIPT_PLUGIN,
  name: 'Scripts',
  description: `Scripts in Composer allow you to deploy custom functions that run on the edge. These functions can be referenced by your AI agent and called inside of cells in any Sheet. Use scripts to interact with API’s or external data inside of Composer.`,
  icon: 'ph--code--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/experimental/plugin-explorer',
  tags: ['experimental'],
  screenshots: ['https://dxos.network/plugin-details-scripts-dark.png'],
} satisfies PluginMeta;
