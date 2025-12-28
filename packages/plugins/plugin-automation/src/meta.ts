//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/automation',
  name: 'Automation',
  description: trim`
    Workflow automation engine that triggers custom actions based on object events and conditions.
    Create automated pipelines that respond to changes and streamline repetitive tasks.
  `,
  icon: 'ph--robot--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-automation',
};
