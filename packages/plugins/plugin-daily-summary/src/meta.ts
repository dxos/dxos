//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.daily-summary',
  name: 'Daily Summary',
  description: trim`
    Generates a daily summary of your activity by querying objects edited in the last day
    and feeding them to an AI agent. Runs on a configurable schedule (default 9 PM).
  `,
  icon: 'ph--calendar-check--regular',
  iconHue: 'amber',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-daily-summary',
};
