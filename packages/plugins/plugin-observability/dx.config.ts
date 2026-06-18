//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.observability',
    name: 'Telemetry',
    author: 'DXOS',
    description: trim`
      Application observability and telemetry collection for monitoring performance and usage patterns.
      Track metrics, logs, and traces for system health and analytics.
    `,
    icon: { key: 'ph--eye--regular' },
    tags: ['system'],
  },
});
