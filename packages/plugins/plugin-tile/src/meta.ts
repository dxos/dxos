//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.tile',
  name: 'Tile',
  description: trim`
    Design tool for creating tile patterns including tessellations.
    Supports square, triangle, and hex grids with real-world dimensions.
  `,
  icon: 'ph--grid-nine--regular',
  iconHue: 'teal',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-tile',
};
