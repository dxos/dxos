//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.github',
  name: 'GitHub',
  description: trim`
    Connect GitHub to your workspace so organizations, repos, issues, and pull requests
    stay available alongside everything else you're doing.
  `,
  icon: 'ph--github-logo--regular',
  iconHue: 'neutral',
  tags: ['labs', 'integration'],
};
