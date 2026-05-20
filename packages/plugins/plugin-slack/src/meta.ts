//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.slack',
  name: 'Slack',
  author: 'DXOS',
  description: trim`
    Connect Slack to your workspace so channels and direct messages stream alongside everything else you're doing.
  `,
  icon: 'ph--slack-logo--regular',
  iconHue: 'purple',
  tags: ['labs', 'integration'],
};
