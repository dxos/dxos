//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.nativeFilesystem',
    name: 'Native Filesystem',
    author: 'DXOS',
    description: trim`
      Open local directories as workspaces inside the Composer desktop app, similar to an Obsidian vault.
      Markdown files and sub-directories are surfaced in the navtree alongside ECHO spaces and objects,
      and edits made in Composer are written back to disk in real time.
      Workspaces can be opened, closed, and refreshed via the app graph action menu;
      ordering is persisted in the user's personal ECHO space so the layout survives restarts.
      Requires the Electron-based Composer desktop app — not available in browser builds.
    `,
    icon: { key: 'ph--folder-open--regular' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
});
