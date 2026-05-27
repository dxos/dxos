//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';
import { DXN } from '@dxos/keys';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.kanban'),
  name: 'Kanban',
  author: 'DXOS',
  description: trim`
    Visual project management using customizable kanban boards to track workflow progress.
    Organize any ECHO type into drag-and-drop columns defined by a single-select field, move cards
    between stages, and reorder both columns and cards — all changes are persisted to ECHO and
    replicated to collaborators in real time.

    Kanban boards come in two variants: view-variant boards source their cards through a linked
    View query (any ECHO type can be pivoted on a single-select field), while items-variant boards
    own their cards explicitly and are used by external sync integrations such as Linear or GitHub.
    Both variants share the same arrangement storage and drag-and-drop mechanics.

    Board settings let users choose which single-select field drives the column layout and
    optionally hide the uncategorized column for items that have no pivot value.
    Field-level undo support allows deleted card fields to be restored without data loss.

    The plugin contributes a Kanban blueprint that exposes board creation and card management
    to AI agents, enabling automated project tracking workflows.
  `,
  icon: 'ph--kanban--regular',
  iconHue: 'green',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-kanban',
  spec: 'PLUGIN.mdl',
  screenshots: ['https://dxos.network/plugin-details-kanban-dark.png'],
};
