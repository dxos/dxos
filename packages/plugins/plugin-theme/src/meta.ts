//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.theme'),
  name: 'Theme',
  author: 'DXOS',
  description: trim`
    Core theming engine providing consistent visual styling across the workspace.
    Switch between light and dark modes and apply custom theme configurations.
  `,
  tags: ['system'],
});
