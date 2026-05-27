//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.nativeFilesystem'),
  name: 'Native Filesystem',
  author: 'DXOS',
  spec: 'PLUGIN.mdl',
  description: trim`
    Open local directories as workspaces inside the Composer desktop app, similar to an Obsidian vault.
    Markdown files and sub-directories are surfaced in the navtree alongside ECHO spaces and objects,
    and edits made in Composer are written back to disk in real time.
    Workspaces can be opened, closed, and refreshed via the app graph action menu;
    ordering is persisted in the user's personal ECHO space so the layout survives restarts.
    Requires the Electron-based Composer desktop app — not available in browser builds.
  `,
  icon: 'ph--folder-open--regular',
  tags: ['labs'],
};
