//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';
import { DXN } from '@dxos/keys';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.observability'),
  name: 'Telemetry',
  author: 'DXOS',
  description: trim`
    Application observability and telemetry collection for monitoring performance and usage patterns.
    Track metrics, logs, and traces for system health and analytics.
  `,
  icon: 'ph--eye--regular',
  tags: ['system'],
};
