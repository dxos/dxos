//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

// TODO(wittjosiah): Rename plugin (package + id) from `native` to `app` to match the user-facing name.
export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.native',
  name: 'App',
  description: trim`
    Native platform integration providing desktop-specific features and system-level capabilities.
    Access native file dialogs, notifications, and OS integrations.
  `,
  icon: 'ph--app-window--regular',
  tags: ['system'],
};
