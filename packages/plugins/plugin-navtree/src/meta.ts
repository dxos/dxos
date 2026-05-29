//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.navtree',
  name: 'Navtree',
  author: 'DXOS',
  spec: 'PLUGIN.mdl',
  description: trim`
    NavTreePlugin renders the application graph as a collapsible hierarchical tree in the Composer sidebar.
    It manages workspace tabs at the root level and provides expand/collapse navigation for spaces, folders,
    and objects, with open/current state persisted to localStorage across sessions.

    The plugin wires drag-and-drop rearrangement and cross-parent transfer of tree items via Pragmatic DnD,
    and registers graph-action keyboard shortcuts (including the ⌘K / Ctrl+K command palette) through a
    global Keyboard singleton that tracks context as the user navigates.

    An operation handler for LayoutOperation.Expose expands ancestor paths on demand so that any
    programmatically activated item is scrolled into view in the tree.

    A commands dialog surfaces all discoverable graph actions as a searchable palette, making it the primary
    keyboard-first entry point for power users.
  `,
  tags: ['system'],
};

// TODO(wittjosiah): Factor out.
export const KEY_BINDING = 'KeyBinding';
// TODO(wittjosiah): Factor out.
export const COMMANDS_DIALOG = `${meta.id}.commands-dialog`;
