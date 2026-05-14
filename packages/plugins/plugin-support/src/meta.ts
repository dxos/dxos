//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.support',
  name: 'Support',
  description: trim`
    In-app support assistant. Open a ticket and collaborate with an AI that can search
    documentation and (later) file follow-up issues — all backed by local-first ECHO data.
  `,
  icon: 'ph--lifebuoy--regular',
  iconHue: 'rose',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-support',
  tags: ['labs'],
};
