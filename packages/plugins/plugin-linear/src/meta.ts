//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.linear',
  name: 'Linear',
  description: trim`
    Linear integration — surface issues, teams, and project state inside
    Composer's data graph, queryable alongside other tools.
  `,
  icon: 'ph--rows--regular',
  iconHue: 'violet',
};
