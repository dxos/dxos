//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/observability',
  name: 'Telemetry',
  description: trim`
    Application observability and telemetry collection for monitoring performance and usage patterns.
    Track metrics, logs, and traces for system health and analytics.
  `,
  icon: 'ph--eye--regular',
};
