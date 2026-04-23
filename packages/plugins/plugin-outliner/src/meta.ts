//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.outliner',
  name: 'Outliner',
  description: trim`
    Tree-structured note-taking editor for organizing ideas hierarchically.
    Collapse and expand nested items, drag to reorder, and navigate deep thought structures efficiently.
  `,
  icon: 'ph--tree-structure--regular',
  iconHue: 'indigo',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-outliner',
  tags: ['labs'],
};

export const QUICK_ENTRY_DIALOG = `${meta.id}.quick-entry-dialog`;
