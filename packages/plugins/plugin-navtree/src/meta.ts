//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/navtree',
  name: 'Navtree',
  description: trim`
    Hierarchical navigation tree for browsing spaces, folders, and objects.
    Provides sidebar navigation with collapsible sections and quick access to workspace content.
  `,
};

// TODO(wittjosiah): Factor out.
export const KEY_BINDING = 'KeyBinding';
// TODO(wittjosiah): Factor out.
export const COMMANDS_DIALOG = `${meta.id}/CommandsDialog`;
