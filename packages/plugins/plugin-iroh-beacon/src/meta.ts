//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.irohBeacon'),
  name: 'Iroh Beacon',
  author: 'DXOS',
  description: 'Peer-to-peer presence beacon for cross-tab and cross-peer liveness.',
  icon: 'ph--broadcast--regular',
  iconHue: 'green',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-iroh-beacon',
  tags: ['labs'],
};
