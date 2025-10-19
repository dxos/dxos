//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/script',
  name: 'Scripts',
  description:
    'Scripts enable you to deploy custom functions that run on the edge. These functions can be referenced by your AI agent and called inside of cells in any Sheet. Use scripts to interact with API’s or external data inside of Composer.',
  icon: 'ph--code--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-explorer',
  tags: ['labs'],
  screenshots: ['https://dxos.network/plugin-details-scripts-dark.png'],
};

// TODO(ZaymonFC): Configure by scopes?
export const defaultScriptsForIntegration: Record<string, string[]> = {
  // TODO(wittjosiah): Also include content extraction scripts in the default set.
  'gmail.com': ['dxos.org/script/gmail'],
};
