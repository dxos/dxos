//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

// TODO(burdon): Rename.
export const INBOX_PLUGIN = 'dxos.org/plugin/inbox';

export default {
  id: INBOX_PLUGIN,
  name: 'Inbox',
  description: 'Manages your email, calendar, and contacts.',
  tags: ['experimental'],
  icon: 'ph--flower--regular',
} satisfies PluginMeta;
