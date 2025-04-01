//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

// TODO(burdon): Rename.
export const INBOX_PLUGIN = 'dxos.org/plugin/inbox';

export const meta: PluginMeta = {
  id: INBOX_PLUGIN,
  name: 'Inbox',
  description: 'Manages your email, calendar, and contacts.',
  icon: 'ph--flower--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/experimental/plugin-inbox',
  tags: ['experimental'],
};
