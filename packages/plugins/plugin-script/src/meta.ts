//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/script',
  name: 'Scripts',
  description: 'Deploy custom functions for AI agents and spreadsheet cells.',
  icon: 'ph--code--regular',
  iconHue: 'sky',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-explorer',
  tags: ['labs'],
  screenshots: ['https://dxos.network/plugin-details-scripts-dark.png'],
};

// TODO(ZaymonFC): Configure by scopes?
export const defaultScriptsForIntegration: Record<string, string[]> = {
  // TODO(wittjosiah): Also include content extraction scripts in the default set.
  'gmail.com': ['dxos.org/script/gmail'],
};
