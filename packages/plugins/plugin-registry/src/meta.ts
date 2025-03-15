//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const REGISTRY_PLUGIN = 'dxos.org/plugin/registry';

// TODO(wittjosiah): Deck does not currently support `/` in ids.
export const REGISTRY_ID = '!dxos:plugin-registry';
export const REGISTRY_KEY = 'plugin-registry';

export const meta = {
  id: REGISTRY_PLUGIN,
  name: 'Plugins',
} satisfies PluginMeta;
