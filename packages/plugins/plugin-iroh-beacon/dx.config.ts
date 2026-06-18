//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '@dxos/app-framework';

export default defineConfig({
  plugin: {
    key: 'org.dxos.plugin.irohBeacon',
    name: 'Iroh Beacon',
    description: 'Peer-to-peer presence beacon for cross-tab and cross-peer liveness.',
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-iroh-beacon',
    icon: { key: 'ph--broadcast--regular', hue: 'green' },
    tags: ['labs'],
  },
});
