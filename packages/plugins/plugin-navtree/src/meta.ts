//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const NAVTREE_PLUGIN = 'dxos.org/plugin/navtree';

// TODO(wittjosiah): Factor out.
export const KEY_BINDING = 'KeyBinding';
// TODO(wittjosiah): Factor out.
export const COMMANDS_DIALOG = `${NAVTREE_PLUGIN}/CommandsDialog`;

export default {
  id: NAVTREE_PLUGIN,
} satisfies PluginMeta;
