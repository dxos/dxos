//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/pipeline',
  name: 'Pipelines',
  description: trim`
    Pipeline management workspace for organizing tasks, milestones, and deliverables.
    Track progress across multiple pipelines and coordinate team activities in a structured environment.
  `,
  icon: 'ph--check-square-offset--regular',
  iconHue: 'purple',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-pipeline',
  tags: ['labs'],
};
