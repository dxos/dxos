//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/inbox',
  name: 'Inbox',
  description: trim`
    Unified inbox for managing email, calendar events, and contacts in one place.
    Sync with external services and organize communications alongside your workspace content.
  `,
  icon: 'ph--address-book-tabs--regular',
  iconHue: 'rose',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-inbox',
  tags: ['labs'],
};
