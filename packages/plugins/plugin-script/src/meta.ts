//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/script',
  name: 'Scripts',
  description: trim`
    Write and deploy custom JavaScript functions that extend your workspace capabilities.
    Create AI agent tools, spreadsheet formulas, and automation scripts that integrate seamlessly with other plugins.
  `,
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
