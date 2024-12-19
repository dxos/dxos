//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

// TODO(burdon): Rename Guide? Help?
export const HELP_PLUGIN = 'dxos.org/plugin/help';

export default {
  id: HELP_PLUGIN,
  name: 'Help',
  icon: 'ph--info--regular',
} satisfies PluginMeta;
