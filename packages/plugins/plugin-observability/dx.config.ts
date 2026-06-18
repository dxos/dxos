//
// Copyright 2025 DXOS.org
//

import { defineConfig } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export default defineConfig({
  plugin: {
    key: 'org.dxos.plugin.observability',
    name: 'Telemetry',
    description: trim`
      Application observability and telemetry collection for monitoring performance and usage patterns.
      Track metrics, logs, and traces for system health and analytics.
    `,
    icon: { key: 'ph--eye--regular' },
    tags: ['system'],
  },
});
