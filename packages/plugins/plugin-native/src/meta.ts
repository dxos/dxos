//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/native',
  name: 'Native',
  description: trim`
    Native platform integration providing desktop-specific features and system-level capabilities.
    Access native file dialogs, notifications, and OS integrations.
  `,
};
