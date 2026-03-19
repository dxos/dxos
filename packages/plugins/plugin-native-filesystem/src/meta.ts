//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.native-filesystem',
  name: 'Native Filesystem',
  description: trim`
    Native filesystem access for Tauri desktop builds.
    Open local directories as workspaces, similar to Obsidian vaults.
  `,
  icon: 'ph--folder-open--regular',
};
