//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.linear',
  name: 'Linear',
  description: trim`
    Connect Linear so projects, issues, and comment threads stay available
    in your workspace alongside everything else you're doing.
  `,
  icon: 'ph--list-checks--regular',
  iconHue: 'neutral',
};
