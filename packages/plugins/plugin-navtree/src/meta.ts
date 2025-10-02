//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/navtree',
  name: 'Navtree',
};

// TODO(wittjosiah): Factor out.
export const KEY_BINDING = 'KeyBinding';
// TODO(wittjosiah): Factor out.
export const COMMANDS_DIALOG = `${meta.id}/CommandsDialog`;
