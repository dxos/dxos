//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/sheet',
  name: 'Sheet',
  description: trim`
    Full-featured spreadsheet application with over 400 built-in formulas for calculations and data analysis.
    Create custom JavaScript functions and integrate with AI agents for advanced automation.
  `,
  icon: 'ph--grid-nine--regular',
  iconHue: 'indigo',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-sheet',
  screenshots: ['https://dxos.network/plugin-details-sheet-dark.png'],
};
