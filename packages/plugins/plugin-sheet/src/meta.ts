//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const SHEET_PLUGIN = 'dxos.org/plugin/sheet';

export const meta: PluginMeta = {
  id: SHEET_PLUGIN,
  name: 'Sheet',
  description:
    'Sheets in Composer are simple spreadsheets which allow you to leverage custom functions inside of cell grids. Leverage more than 400 pre-built formulas like Sum, Average, Count, Max, Min along with many others. You can also deploy your own custom functions using the Scripts plugin. ',
  icon: 'ph--grid-nine--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-sheet',
  screenshots: ['https://dxos.network/plugin-details-sheet-dark.png'],
};
