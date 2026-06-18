//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.irohBeacon',
    name: 'Iroh Beacon',
    author: 'DXOS',
    description: 'Peer-to-peer presence beacon for cross-tab and cross-peer liveness.',
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-iroh-beacon',
    icon: { key: 'ph--broadcast--regular', hue: 'green' },
    tags: ['labs'],
  },
});
