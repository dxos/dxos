//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/project',
  name: 'Projects',
  description: trim`
    Project management workspace for organizing tasks, milestones, and deliverables.
    Track progress across multiple projects and coordinate team activities in a structured environment.
  `,
  icon: 'ph--check-square-offset--regular',
  iconHue: 'purple',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-project',
  tags: ['labs'],
};
