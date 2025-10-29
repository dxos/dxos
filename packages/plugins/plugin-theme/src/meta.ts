//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/theme',
  name: 'Theme',
  description: trim`
    Core theming engine providing consistent visual styling across the workspace.
    Switch between light and dark modes and apply custom theme configurations.
  `,
};
