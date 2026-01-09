//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/map',
  name: 'Maps',
  description: trim`
    Interactive mapping visualization that plots table records containing latitude and longitude coordinates.
    Explore spatial data, add custom markers, and visualize geographic patterns in your datasets.
  `,
  icon: 'ph--compass--regular',
  iconHue: 'green',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-map',
  tags: ['labs'],
  screenshots: ['https://dxos.network/plugin-details-map-dark.png'],
};
