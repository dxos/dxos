//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.native-filesystem',
  name: 'Native Filesystem',
  description: trim`
    Native filesystem access for desktop builds.
    Open local directories as workspaces, similar to Obsidian vaults.
    Requires the Composer desktop app.
  `,
  icon: 'ph--folder-open--regular',
  tags: ['labs'],
};
