//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/native',
  name: 'Native',
  description: trim`
    Native platform integration providing desktop-specific features and system-level capabilities.
    Access native file dialogs, notifications, and OS integrations.
  `,
};
