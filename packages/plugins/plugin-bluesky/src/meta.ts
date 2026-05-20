//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.bluesky',
  name: 'Bluesky',
  author: 'DXOS',
  description: trim`
    Connect Bluesky / atproto to your workspace so your timeline, likes, and saved feeds sync into local Feed objects.
  `,
  icon: 'ph--butterfly--regular',
  iconHue: 'sky',
  tags: ['labs', 'integration'],
};
