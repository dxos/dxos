//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.slack',
  name: 'Slack',
  description: trim`
    Slack channel integration for Composer Agent.
    Connects your agent to Slack workspaces.
  `,
  icon: 'ph--slack-logo--regular',
};
