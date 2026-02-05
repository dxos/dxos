//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/map-solid',
  name: 'Maps (Solid)',
  description: trim`
    Map surface for SolidJS.
  `,
  icon: 'ph--compass--regular',
  iconHue: 'green',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-map',
  tags: ['labs'],
  screenshots: ['https://dxos.network/plugin-details-map-dark.png'],
};
