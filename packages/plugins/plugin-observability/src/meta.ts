//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.observability'),
  name: 'Telemetry',
  author: 'DXOS',
  description: trim`
    Application observability and telemetry collection for monitoring performance and usage patterns.
    Track metrics, logs, and traces for system health and analytics.
  `,
  icon: 'ph--eye--regular',
  tags: ['system'],
});
