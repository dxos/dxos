//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.iroh-beacon',
  name: 'Iroh Beacon',
  description: 'Peer-to-peer presence beacon over iroh-gossip.',
  icon: 'ph--broadcast--regular',
  iconHue: 'green',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-iroh-beacon',
};
